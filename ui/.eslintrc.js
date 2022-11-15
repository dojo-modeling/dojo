module.exports = {
  "parser": "@babel/eslint-parser",
  "extends": ["airbnb", "plugin:react-hooks/recommended", "plugin:storybook/recommended"],
  "env": {
    "browser": true,
    "node": true
  },
  "rules": {
    "no-console": "off",
    "comma-dangle": "off",
    "no-underscore-dangle": "off",
    "react/jsx-filename-extension": "off",
    "react/jsx-props-no-spreading": "off",
    "react/jsx-one-expression-per-line": "off",
    "react/prop-types": "off",
    "consistent-return": "off",
    "import/prefer-default-export": "off",
    "no-nested-ternary": "off",
    "no-restricted-syntax": "off",
    "no-plusplus": "off",
    "camelcase": "off",
    "jsx-a11y/alt-text": "warn",
    "react/jsx-props-no-multi-spaces": "off",

    "sort-imports": ["error", {
      "ignoreCase": false,
      "ignoreDeclarationSort": true,
      "ignoreMemberSort": true,
      "allowSeparatedGroups": true
    }]
  }
};
