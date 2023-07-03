## 🌈 微信公众号通用授权服务

### 安装/配置/运行

```bash
# 安装项目依赖
yarn

# 配置公众号信息
cp .env.sample .env

# 运行项目
yarn serve
```

### 用法

重定向跳转

- scope: `snsapi_base` `snsapi_userinfo`
- returnUrl: 授权后返回地址, 使用 `encodeURIComponent` 编码, 授权地址需要到 `whiteList.txt` 中提前配置

```bash
GET /auth/wxlogin?scope={SCOPE}&returnUrl={returnUrl}
```

示例url

```bash
# 用户信息授权
http://192.168.1.5:3000/auth/wxlogin?returnUrl=http%3A%2F%2F192.168.1.5%3A3000%2Fsuccess&scope=snsapi_userinfo

# 静默授权
http://192.168.1.5:3000/auth/wxlogin?returnUrl=http%3A%2F%2F192.168.1.5%3A3000%2Fsuccess&scope=snsapi_base
```
