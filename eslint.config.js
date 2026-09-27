import js from '@eslint/js';
import globals from 'globals';
export default [{ignores:['**/node_modules/**','**/dist/**','.local/**']},js.configs.recommended,{files:['**/*.{js,jsx}'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:{...globals.browser,...globals.node},parserOptions:{ecmaFeatures:{jsx:true}}},rules:{'no-unused-vars':'off','no-empty':['error',{allowEmptyCatch:true}]}}];
