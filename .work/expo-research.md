# Verificação Expo SDK 58

- Referência do SDK 58: https://docs.expo.dev/versions/v58.0.0/
  - Expo SDK 58.0.0 indica React Native 0.88, React 19.3.0 e React Native Web 0.21.0.
- Referência de `react-native-svg` para SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/svg/
  - Versão recomendada: 15.16.0; a página marca suporte a Web e inclusão no Expo Go.
- O manifesto/lockfile mobile do QuadraPass declara Expo 58.0.23, React 19.3.0, React Native 0.88.1 e `react-native-svg` 15.16.0; `react-native-web` 0.21.4 satisfaz a linha 0.21.x.
- Conclusão: a matriz principal está alinhada à referência consultada. A falha de Expo Web registrada no relatório não deve ser atribuída automaticamente a uma incompatibilidade dessas versões; é necessário executar o export e ler o erro atual.
