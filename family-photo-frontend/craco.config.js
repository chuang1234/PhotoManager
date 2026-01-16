// 项目根目录 /craco.config.js
const path = require('path');

module.exports = {
    // 配置 webpack
    webpack: {
        // 配置别名（可选，但建议加，避免路径错误）
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
        configure: (webpackConfig, { env, paths }) => {
            // 1. 找到所有规则，添加 Less 解析
            const oneOfRule = webpackConfig.module.rules.find(rule => rule.oneOf);
            if (oneOfRule) {
                // 向 oneOf 中添加 Less 规则（优先级更高）
                oneOfRule.oneOf.unshift({
                    test: /\.less$/,
                    exclude: /node_modules/, // 排除 node_modules 中的 Less（AntD 单独处理）
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                modules: {
                                    localIdentName: '[name]__[local]--[hash:base64:5]', // 模块化类名格式
                                },
                                importLoaders: 2,
                            },
                        },
                        'less-loader',
                    ],
                });

                // 处理 AntD 的 Less（如果需要自定义 AntD 主题，可保留）
                oneOfRule.oneOf.unshift({
                    test: /\.less$/,
                    include: /node_modules/,
                    use: [
                        'style-loader',
                        'css-loader',
                        {
                            loader: 'less-loader',
                            options: {
                                lessOptions: {
                                    javascriptEnabled: true, // 必须开启，否则 AntD Less 编译失败
                                },
                            },
                        },
                    ],
                });
            }
            return webpackConfig;
        },
    },
    // 开发服务器配置（代理核心）
    devServer: {
        // 代理规则：匹配路径前缀，转发到后端地址
        proxy: {
            // 1. 接口请求代理（/api 开头的请求转发到后端）
            '/api': {
                target: 'http://localhost:5000', // 后端服务地址
                changeOrigin: true, // 开启跨域代理（关键）
                pathRewrite: { '^/api': '/api' } // 路径不重写（保持 /api 前缀）
            },
            // 2. 照片文件代理（/uploads 开头的静态文件）
            '/uploads': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                pathRewrite: { '^/uploads': '/uploads' }
            },
            // 3. 封面文件代理（/covers 开头的静态文件）
            '/covers': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                pathRewrite: { '^/covers': '/covers' }
            }
        },
        // 可选：解决热更新问题（如果有）
        client: {
            overlay: false // 关闭错误浮层（可选）
        }
    }
};