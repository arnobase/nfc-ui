const path = require('path');

module.exports = {
    // Point d'entrée de votre application
    entry: './src/index.js', // Modifiez ce chemin selon votre structure de projet
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
        publicPath: '/',
    },
    resolve: {
        fallback: {
            https: require.resolve('https-browserify'),
            http: require.resolve('stream-http'),
            stream: require.resolve('stream-browserify'),
            buffer: require.resolve('buffer/'),
            path: require.resolve("path-browserify"),
            // Ajoutez d'autres polyfills si nécessaire
        },
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    devServer: {
        https: true,
        historyApiFallback: true,
        static: path.join(__dirname, 'dist'),
        port: process.env.REACT_APP_FRONTEND_PORT,
    },
    mode: 'development', // Changez en 'production' pour la version finale
};
