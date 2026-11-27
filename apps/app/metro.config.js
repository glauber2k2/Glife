// Metro padrão do Expo + texto da Bíblia embutido como asset (`.bible`, JSON lido sob demanda, fora do bundle JS).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('bible');

module.exports = config;
