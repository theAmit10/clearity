#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppIconModule, NSObject)

RCT_EXTERN_METHOD(setIcon:(NSString *)name
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getIcon:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(hideLaunchOverlay)

@end
