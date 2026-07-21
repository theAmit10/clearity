declare module 'react-native-config' {
  interface Env {
    MIXPANEL_TOKEN: string;
  }

  const Config: Env;
  export default Config;
}
