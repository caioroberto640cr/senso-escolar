import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// O Expo Snack renderiza o *default export* do arquivo de entrada (main),
// então também exportamos o App aqui para funcionar no Snack.
export default App;
