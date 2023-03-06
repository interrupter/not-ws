// Rollup plugins
import babel from "@rollup/plugin-babel";
import eslint from "@rollup/plugin-eslint";
import terser from "@rollup/plugin-terser";
import filesize from "rollup-plugin-filesize";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
    input: "src/browser/client.js",
    output: {
        name: "notWSClient",
        format: "iife",
        file: "build/client.js",
        sourcemap: false,
    },
    plugins: [
        resolve({
            browser: true,
        }),
        commonjs(),
        eslint({
            fix: true,
            exclude: [
                "tmpl/**",
                "build/**",
                "node_modules/**",
                "css/**",
                "js/**",
                "test/**",
                "bower_components/**",
                "assets/*",
                "dist/**",
            ],
        }),
        babel({
            babelrc: false,
            exclude: [
                "tmpl/**",
                "build/**",
                "node_modules/**",
                "css/**",
                "js/**",
                "test/**",
                "bower_components/**",
                "assets/*",
                "dist/**",
            ],
        }),
        filesize(),
    ],
};
