declare module 'react-native-config' {
  interface Env {
    MIXPANEL_TOKEN: string;
    REVENUECAT_API_KEY: string;
  }

  const Config: Env;
  export default Config;
}
