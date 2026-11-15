# Referências oficiais — UI mobile e URL pública da API

Verificado em 15/11/2026 para o QuadraPass Mobile.

- Expo SDK 58 documenta React Native 0.88 e React 19.3; o manifesto atual usa `expo ~58.0.23`, `react-native 0.88.1` e React 19.3.0. Fonte: https://docs.expo.dev/versions/v58.0.0/
- React Native 0.88 Flexbox documenta `flexWrap`, `flexBasis`, `flexGrow` e `gap`, usados para a grade responsiva dos horários. Fonte: https://reactnative.dev/docs/0.88/flexbox
- `Pressable` é componente base para interações de toque; `View` suporta propriedades de acessibilidade. Usados para preservar horários clicáveis e rótulos por leitor de tela. Fontes: https://reactnative.dev/docs/0.88/pressable e https://reactnative.dev/docs/0.88/view
- Expo CLI substitui referências estáticas `process.env.EXPO_PUBLIC_*` no bundle do app. Esses valores são visíveis ao usuário final, não devem conter segredos; alteração da variável precisa ser seguida de reload/build atualizado. Fonte: https://docs.expo.dev/guides/environment-variables/
- O índice oficial Expo consultado conforme `mobile/AGENTS.md`: https://docs.expo.dev/llms.txt


## GitHub e distribuição — 15/11/2026

GitHub Pages é hospedagem estática HTML/CSS/JavaScript e não executa o backend Node/tRPC/MySQL do QuadraPass. Fonte oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

EAS Build gera binários instaláveis Expo/React Native para Android e iOS, gerencia credenciais de assinatura se configurado, integra distribuição interna e aceita builds conectados ao GitHub. Fonte: https://docs.expo.dev/build/introduction/

Distribuição interna Expo gera APK diretamente instalável no Android; builds iOS usam provisionamento apropriado, por exemplo ad hoc com dispositivos registrados, ou distribuição pelas lojas. Fonte: https://docs.expo.dev/build/internal-distribution/
