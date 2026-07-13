#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetModule, NSObject)

RCT_EXTERN_METHOD(setSelectedHabitIds:(NSArray<NSString *> *)ids)
RCT_EXTERN_METHOD(getSelectedHabitIds:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(updateWidgetData:(NSString *)jsonString)
RCT_EXTERN_METHOD(reloadWidget)

@end
