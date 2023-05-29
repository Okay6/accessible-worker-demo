const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const HookShellScriptPlugin = require('hook-shell-script-webpack-plugin');


module.exports = {
    entry: {
        "main": "./src/index.ts",
    },
    plugins: [
        new HtmlWebpackPlugin({
           template:'./src/index.html'
        }),
        new HookShellScriptPlugin({
            afterEmit: ['npm run awm']
        })
    ],
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: [
                    {
                        loader: "ts-loader",
                    }
                ],
            },
            {

                test: /\.css$/,

                use: ['style-loader', 'css-loader']

            }
        ]
    },
    devServer: {
        port: 3000,
        static: 'dist',
        hot: true,
        https: false,
        allowedHosts:'all',
    },
    mode: "development",
}
