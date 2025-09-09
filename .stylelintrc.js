module.exports = {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['dist/**/*'],
  rules: {
    'block-no-empty': null, // Allow empty blocks in generated files
  },
};