const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const Koa = require('koa');
const app = new Koa();
const axios = require('axios');
const Router = require('koa-router');

require('dotenv').config();
const {
    APP_PORT,
    LOG_LEVEL,
    LOG_SAVE_DAYS
} = process.env


// 创建Logger实例
const logger = winston.createLogger({
    level: LOG_LEVEL, // 设置日志级别
    format: winston.format.json(), // 设置日志格式为JSON
    transports: [
        // 添加控制台输出
        new winston.transports.Console(),
        // 添加每天分割的文件输出
        new DailyRotateFile({
            filename: 'logs/%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: LOG_SAVE_DAYS // 保留7天内的日志文件
        })
    ]
  });

// 日志中间件
app.use(async (ctx, next) => {
    const ip = ctx.headers['x-forwarded-for'] || ctx.ip || '0.0.0.0';
    const start = Date.now();
    await next();
    const responseTime = Date.now() - start;
    logger.info(`${ip} - ${ctx.method} ${ctx.url} - ${ctx.status} (${responseTime}ms)`);
});

// 使用路由
const router = new Router();
app.use(router.routes());

// 网页授权
router.get('/auth/wxlogin', async (ctx) => {
    try {
        // 最终跳转目标 URL (scope: snsapi_base | snsapi_userinfo)
        let { returnUrl, scope } = ctx.request.query;
        if (!scope) {
            scope = 'snsapi_base';
        }

        // 验证白名单
        const whileList = fs.readFileSync('whiteList.txt', 'utf8').split("\n");
        const exist = whileList.find(url => url == returnUrl);
        if (!exist) {
            throw new Error('ReturnURL 不正确');
        }

        // 微信公众号 APPID
        const { WX_APPID } = process.env;

        // 编码重定向 URL
        const redirect_uri = encodeURIComponent('http://' + ctx.request.header.host + '/auth/code2session?to=' + encodeURIComponent(returnUrl));

        const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WX_APPID}&redirect_uri=${redirect_uri}&response_type=code&scope=${scope}&state=STATE#wechat_redirect`

        // 重定向
        ctx.redirect(url)
    } catch (err) {
        ctx.response.status = 500;
        ctx.response.body = `<h3>微信授权服务异常, ${err.message || 'Unknown'}</h3>`
        logger.error(ctx.response.body, err)
    }
})

// code 交换用户信息
router.get('/auth/code2session', async (ctx) => {
    try {
        const { to } = ctx.request.query;

        // 获取微信授权的code
        const code = ctx.query.code;
        const { WX_APPID, WX_APPSENRET } = process.env;

        // 通过code获取access_token和openid
        const data = await axios.get(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WX_APPID}&secret=${WX_APPSENRET}&code=${code}&grant_type=authorization_code`);
        const { access_token, openid } = data.data;

        // 获取用户信息
        const userData = await axios.get(`https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`);
        const { nickname, headimgurl, sex, city, country, unionid } = userData.data;

        let params = [];
        params.push(`openid=${openid}`);
        if (unionid) {
            params.push(`unionid=${unionid}`);
        }
        if (nickname) {
            params.push(`nickname=${nickname}`);
        }
        if (headimgurl) {
            params.push(`headimgurl=${headimgurl}`);
        }
        if (sex) {
            params.push(`sex=${sex}`);
        }
        if (city) {
            params.push(`city=${city}`);
        }
        if (country) {
            params.push(`country=${country}`);
        }

        // 重定向到登录成功页面
        ctx.redirect(to + '?' + params.join('&'));
    } catch (err) {
        ctx.response.status = 500;
        ctx.response.body = `<h3>微信授权服务异常, ${err.message || 'Unknown'}</h3>`
        logger.error(ctx.response.body, err)
    }
})

// 监听端口
app.listen(APP_PORT, () => {
    logger.info('Server is running on port ' + APP_PORT);
})