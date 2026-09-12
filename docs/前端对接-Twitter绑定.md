# 前端对接：Twitter 绑定（真验证 / 假验证）

> 版本：**v2.2**（2026-09-10）· 对应后端分支 `waitlist-v2`
> 主文档：`docs/api/前端对接接口文档.md`（通用约定、认证、错误码体系见主文档 §1；本文是 Twitter 绑定全链路的字段级详解）
> 影响范围：**3 个新接口 + 3 个已有接口新增字段**。全部向后兼容——不接这些字段的老代码行为不变。
> 后端配套：`.env` 开关 `TWITTER_FAKE_VERIFY`（true=假验证 / false 或缺省=真验证），**运维切换、前端无需感知**，但字段值在不同模式下有差异（见 §6 差异矩阵）。

---

## 1. 一句话说明 + 业务背景

用户把**含本人邀请链接**的推文发到 X 后，回到页面**回填推文链接**完成 Twitter 绑定。绑定成功的用户，会成为**上级的有效邀请**——这是「有效邀请」的唯一口径：

- `inviteNum`：好友完成**注册**即 +1（老口径，不变）
- `validInviteNum`：好友完成 **Twitter 绑定**才 +1（新口径，**有效邀请**）
- **排名不受绑定影响**（`rank` / `rankScore` 与本功能完全无关）

**分享文案要求（重要）**：推文中必须包含完整邀请链接 `/waitlist/?invite={inviteCode}`（`inviteCode` 取自 `GET /user/info`，8 位码），且推文为公开推文。真验证会校验链接里的码与本人一致，不一致按 `failCode=8` 失败。

---

## 2. 接入优先级（先看这张表）

| 优先级 | 内容 | 接口 / 字段 | 不接的后果 |
| --- | --- | --- | --- |
| **P0 必接** | 回填提交 + 结果轮询 | `POST /user/submit_tweet_link`、`GET /user/twitter_bind_status` | 用户无法完成绑定，整个功能不存在 |
| **P0 必接** | 页面状态恢复（已绑/未绑） | `/user/info` 的 `twitterBound` | 刷新/回访后无法恢复"已绑定"状态，用户会重复走流程 |
| **P1 重要** | 有效邀请展示（本人统计） | `/user/info`（或 `/user/my_result`）的 `validInviteNum` | 用户看不到"有效邀请 N 人"，激励闭环缺失 |
| **P1 重要** | 有效邀请展示（上级列表） | `/user/invite_friends` 的 `list[].twitterBound` + `validTotal` | 邀请列表无法区分有效/无效邀请，核心卖点缺失 |
| **P2 可选** | 回填时的占用预检 | `GET /waitlist_public/check_tweet_link` | 仅损失输入体验（提交时后端仍会校验并返回 701） |
| **P2 可选** | 失败细分码 `failCode` | `twitter_bind_status.failCode` | 直接展示 `failMessage` 即可，码只是做精准文案/埋点用 |
| **P2 可选** | 已提交推文链接展示 | `twitter_bind_status.tweetLink`、`twitterAccount` | 仅损失信息展示（"你已绑定 @xxx"） |
| **不用接** | — | 不要用 `/user/my_result` 轮询绑定状态（那是结果页接口）；不要本地校验邀请码格式（后端会验） | — |

---

## 3. 用户流程（时序）

### 3.1 真验证模式（默认）

```
[结果页/分享页]
  1. 取 inviteCode（/user/info），拼分享文案（含 /waitlist/?invite={code} 完整链接）
  2. 用户点分享 → 打开 X 发推（公开推文）
  3. 用户回到页面，粘贴推文链接
     ├─（可选）GET /waitlist_public/check_tweet_link 预检 used
     └─ POST /user/submit_tweet_link { tweetLink }        → data.status = 1（待验证）
  4. 轮询 GET /user/twitter_bind_status（建议 3–5s 一次，≤2 分钟）
     ├─ status = 1  继续轮询（后台 3 秒一轮，通常几秒内出结果）
     ├─ status = 2  成功：展示"已绑定 @twitterAccount"；刷新 /user/info 确认 twitterBound=1
     └─ status = 3  失败：展示 failMessage；允许修改链接重新提交（回到第 3 步）
```

> 后台验证内容：推文存在且公开（Sorsa API）→ 推文含**本人**邀请链接 → 推文作者的 Twitter 账号未被他人绑定。验证在后台异步完成，前端只管轮询。

### 3.2 假验证模式（`TWITTER_FAKE_VERIFY=true`）

```
  3. POST /user/submit_tweet_link { tweetLink }  → data.status = 2（立即绑定成功）
     └─ 无需轮询，直接展示成功；twitterAccount 为空串（此模式无推特身份）
```

其余展示字段（`twitterBound`、`validInviteNum`、邀请列表）两种模式**完全一致**。

---

## 4. 枚举定义（字段级注释）

### 4.1 `status`（twitterBindStatus，对外统一枚举）

| 值 | 含义 | 前端处理 |
| --- | --- | --- |
| 0 | **未提交**：从未回填过推文链接 | 展示「分享并回填」引导 |
| 1 | **待验证**：已提交，后台验证中（真验证模式专属状态） | 展示验证中 + 轮询；假验证模式不会出现此状态 |
| 2 | **绑定成功**：真验证（有推特身份）或假验证（无身份）通过 | 展示成功；真验证可附带 `@twitterAccount` |
| 3 | **验证失败**：终态失败，可换链接重新提交 | 展示 `failMessage`，提供重新提交入口 |

### 4.2 `failCode`（失败细分码，仅 `status=3` 时非 0；`failMessage` 可直接展示）

| failCode | 含义 | failMessage（英文原文） | 用户该怎么办 |
| --- | --- | --- | --- |
| 2 | 通用验证失败（事务异常等罕见兜底） | `Verification failed. Please check the tweet and resubmit.` | 检查后重提 |
| 3 | 验证服务暂不可用（API 网络类故障） | `Verification service is busy. Please resubmit in a minute.` | 稍后重提 |
| 5 | 推文不存在 / 非公开 / 已删除 | `Tweet not found. Make sure the post is public and the link is correct.` | 确认推文公开后重提 |
| 6 | 账号状态异常（被封禁等） | `Account state changed. Please contact support.` | 联系客服 |
| 8 | **最常见**：推文未包含本人邀请链接（`?invite=` 与本人码不一致 / 链接缺失） | `Your tweet must contain your own invite link (?invite=...).` | 用本人邀请链接重发推文 |
| 9 | 该 Twitter 长号已被其他用户绑定 | `This Twitter account is already bound to another user.` | 一个推特号只能绑一个用户 |
| 10 | 该 Twitter 用户名已被其他用户绑定 | 同上 | 同上 |

---

## 5. 接口详解

### 5.1 POST /user/submit_tweet_link — 回填推文链接（P0）

**认证**：userToken（`Authorization: jwt <token>`）· **防刷**：lock 2s（同一用户 2 秒内仅一次）

**入参（body）**

| 字段 | 类型 | 必填 | 注释 |
| --- | --- | --- | --- |
| tweetLink | string | 是 | 推文链接。必须包含 `x.com/` 或 `twitter.com/`；长度 ≤ 500；前后空格自动 trim。示例：`https://x.com/xxx/status/2001252812303511611?s=20` |

**出参（data）**

| 字段 | 类型 | 注释 |
| --- | --- | --- |
| status | number | **模式相关**：真验证 = `1`（待验证，去轮询）；假验证 = `2`（已绑定成功，无需轮询） |

**提交规则（前端无需实现，知悉即可）**

- 一人一条记录；**待验证 / 验证失败**可换链接重提（重置为待验证）
- **真验证通过后为终态**：再提交返回 701 `Twitter account already bound`
- **假验证通过后非终态**：切回真验证模式后可重新提交（重绑升级，见 §6）
- 同链接重复提交：幂等返回成功（不重复验证、不重复计数）
- **他人已提交过的推文（任意状态）不可使用**：返回 701 `This post has already been used.`

**失败分支（701，message 可直接展示）**

| message | 场景 |
| --- | --- |
| `Invalid tweet link format` | 链接不含 x.com/ / twitter.com/，或超长 |
| `This post has already been used.` | 该推文已被其他用户提交 |
| `Twitter account already bound` | 本人已真验证绑定成功（终态），无需重复提交 |
| `user not found` | 仅假验证模式可能返回（用户不存在/封禁） |
| `service is busy` | 请求锁（2 秒内重复提交） |

### 5.2 GET /user/twitter_bind_status — 绑定状态查询（P0，提交后轮询用）

**认证**：userToken · 无入参 · 无请求锁（轮询友好）

**出参（data）全字段注释**

| 字段 | 类型 | 注释 |
| --- | --- | --- |
| status | number | 绑定状态，枚举见 §4.1。**绑定与否的唯一权威判定** |
| tweetLink | string | 本人当前已回填的推文链接；未提交（status=0）为 `""`；其余状态（含已绑定）均返回当前链接，可用于展示"你提交的推文" |
| twitterAccount | string | 绑定的 Twitter 用户名（不带 @，展示时自行拼）。**仅 status=2 且真验证通过时有值**；假验证绑定为 `""`（无推特身份）；其余状态恒 `""` |
| failCode | number | 失败细分码，**仅 status=3 非 0**（枚举见 §4.2）；其余状态恒 0 |
| failMessage | string | 失败英文提示，**仅 status=3 非空**，可直接展示给用户；其余状态恒 `""` |

**各状态返回值示例**

```json
// status=0 未提交
{ "status": 0, "tweetLink": "", "twitterAccount": "", "failCode": 0, "failMessage": "" }

// status=1 待验证（真验证模式）
{ "status": 1, "tweetLink": "https://x.com/foo/status/123?s=20", "twitterAccount": "", "failCode": 0, "failMessage": "" }

// status=2 绑定成功（真验证：有身份）
{ "status": 2, "tweetLink": "https://x.com/foo/status/123?s=20", "twitterAccount": "foo", "failCode": 0, "failMessage": "" }

// status=2 绑定成功（假验证：无身份）
{ "status": 2, "tweetLink": "https://x.com/foo/status/123?s=20", "twitterAccount": "", "failCode": 0, "failMessage": "" }

// status=3 验证失败
{ "status": 3, "tweetLink": "https://x.com/foo/status/123?s=20", "twitterAccount": "", "failCode": 8,
  "failMessage": "Your tweet must contain your own invite link (?invite=...)." }
```

**失败分支（701）**：`user not found`。

**轮询建议**：3–5 秒间隔；最多轮询约 2 分钟，超时提示"稍后回来查看"——终态持久化，回访时凭 `/user/info` 的 `twitterBound=1` 即可恢复，不依赖轮询窗口。

### 5.3 GET /waitlist_public/check_tweet_link — 推文占用预检（P2 可选）

**认证**：无 · **防刷**：每 IP 12 小时最多 30 次（超限 701）

**入参（query）**：`tweetLink`（string，必填，格式要求同 5.1）

**出参（data）**

| 字段 | 类型 | 注释 |
| --- | --- | --- |
| used | boolean | `true` = 该推文已被其他用户提交（任意状态：待验证/已绑定/已失败），提交必被拒；`false` = 可用。**结果仅供体验优化**，提交时后端仍会强校验 |

**失败分支（701）**：`Invalid tweet link format`、`Too many requests. Try again later.`。

### 5.4 已有接口的新增字段

#### GET /user/info（P0/P1）

| 字段 | 类型 | 注释 |
| --- | --- | --- |
| twitterBound | number | 本人 Twitter 绑定状态：`1`=已绑定（真**或**假验证通过，以绑定记录为准）、`0`=未绑定/验证中/失败。**页面恢复用**，不需要过程状态时用它即可 |
| validInviteNum | number | 有效邀请人数：直接邀请好友中完成 Twitter 绑定的人数。假验证模式同样会累计（提交即算）。仅统计，**与排名无关** |

#### GET /user/my_result（P1，解锁态附加字段）

| 字段 | 类型 | 注释 |
| --- | --- | --- |
| twitterBound | number | 同 `/user/info`（同一数据另一取出处，结果页方便用） |
| validInviteNum | number | 同上 |

#### GET /user/invite_friends（P1）

| 字段 | 类型 | 注释 |
| --- | --- | --- |
| list[].twitterBound | number | 该好友是否有效邀请：`1`=已完成 Twitter 绑定（真或假）、`0`=未完成。**上级列表的"有效邀请"标识就靠它** |
| validTotal | number | 有效邀请总数（= `/user/info` 的 `validInviteNum`，同口径）。`total` 仍为注册口径的 `inviteNum`，两者可同时展示为「已邀请 N / 有效 M」 |

---

## 6. 模式切换后的字段差异（核心）

后端 `.env` 的 `TWITTER_FAKE_VERIFY` 由运维切换（改后重启生效）。**前端零改动**，但要知道各场景下字段会长什么样：

| 场景 | submit 返回 | bind_status.status | twitterAccount | twitterBound（本人） | 上级列表该好友 twitterBound | 上级 validInviteNum |
| --- | --- | --- | --- | --- | --- | --- |
| 真验证 · 新提交 → 通过 | `1` → 轮询得 `2` | 0→1→2 | `@用户名` | 0→1 | 0→1 | +1 |
| 真验证 · 新提交 → 失败 | `1` → 轮询得 `3` | 0→1→3 | `""`（失败无身份） | 0（保持未绑定） | 0 | 不变 |
| 假验证 · 提交 | **`2`（立即成功）** | 0→**2**（无 1 态） | **`""`（永远无身份）** | 0→1 | 0→1 | +1 |
| 假→真 · 存量假绑定用户（不重绑） | —（不提交则不变） | 保持 `2` | 保持 `""` | 保持 1 | 保持 1 | **保持已计的 +1（不追溯）** |
| 假→真 · 用户重绑提交中 | `1` | 2→**1**（短暂"验证中"） | `""` | **1→0（短暂回落）** | 1→0（短暂回落） | **不变（不回退）** |
| 假→真 · 重绑通过 | —（轮询得 `2`） | 1→2 | `@用户名`（补齐身份） | 0→1 | 0→1 | **不变（不重复 +1）** |
| 假→真 · 重绑失败 | —（轮询得 `3`） | 1→3 | `""` | 0 | 0 | 不变（此前假验证的 +1 已计，不回退） |
| 真→假 · 切换时还在"验证中"的用户 | — | 1→**2**（后台自动按假验证结算，无人卡在验证中） | `""` | 0→1 | 0→1 | +1 |

**三条硬规则**（重绑场景的前端预期管理）：

1. **`validInviteNum` 永不波动**：一次绑定全局只计一次（后端 `rewarded` 标记防重），重绑无论成败都不影响上级已得的计数。
2. **`twitterBound` 在重绑等待期会短暂回落 1→0**（用户主动发起升级时的诚实状态），通过后恢复 1。若不希望列表闪烁，可在前端对该好友缓存最近一次 `twitterBound=1` 的展示——但本人状态页必须如实显示"验证中"。
3. **重绑入口**：假绑定用户在真验证模式下**重新提交即可**（流程与首次完全一致）；前端不需要判断"上次是假绑定"，后端自动放行。

---

## 7. 边界与注意事项

1. **推文必须是公开推文**，且包含**完整的本人邀请链接** `/waitlist/?invite={inviteCode}`（从 `/user/info` 的 `inviteCode` 拼，勿本地造码）。链接被 X 压缩为 t.co 短链时后端会尝试还原，还原失败按 `failCode=8` 处理——建议分享文案把链接**独立成行**放文末。
2. **一条推文全局只能被认领一次**（含他人已失败的占用），建议在输入框失焦时调 5.3 预检，体验更好。
3. **一个 Twitter 账号只能绑定一个用户**（长号与用户名双重校验），小号互刷在真验证下不可行。
4. `submit` 的 701 `Twitter account already bound` 是**成功终态的重复提交**，前端应展示"已绑定"而非报错样式。
5. 轮询接口（5.2）**无请求锁、轻量**，但请不要低于 3 秒一次；终态持久化，超时放弃轮询是安全的。
6. 401（token 过期）与 500 处理走主文档 §3.6 通用约定；`submit` / 轮询期间的 500 直接让用户重试，不会产生脏数据（提交是幂等的）。
7. 假验证模式下**没有防刷语义**（任何链接都算绑定成功），适合测试期或验证服务故障时的降级兜底——产品文案上不要在此模式做"强绑定"承诺。

---

## 8. 接入清单（逐条勾掉即可）

- [ ] 分享文案改为携带完整邀请链接 `/waitlist/?invite={inviteCode}`（`inviteCode` 取自 `/user/info`）
- [ ] 结果/分享页增加「回填推文链接」入口：输入框 + 提交按钮（`POST /user/submit_tweet_link`）
- [ ] 提交后按返回 `status` 分流：`1` 进入轮询；`2` 直接展示成功（两种都要处理，模式后端可切）
- [ ] 轮询 `GET /user/twitter_bind_status`（3–5s，≤2 分钟）：`2` 成功（真验证可展示 `@twitterAccount`）；`3` 展示 `failMessage` 并允许重提
- [ ] 回访/刷新时用 `/user/info` 的 `twitterBound` 恢复"已绑定"状态（不依赖轮询）
- [ ] 统计位展示 `validInviteNum`（可与 `inviteNum` 并列展示「有效 N / 共 M」）
- [ ] 邀请列表页每项渲染 `twitterBound` 标识，头部/汇总用 `validTotal`
- [ ] （可选）输入框失焦调 `check_tweet_link` 预检 `used`
- [ ] （可选）`failCode` 接入精准文案或埋点（直接用 `failMessage` 也完全够用）
