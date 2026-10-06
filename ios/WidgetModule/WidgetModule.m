#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetModule, NSObject)

RCT_EXTERN_METHOD(setSelectedHabitIds:(NSArray<NSString *> *)ids)
RCT_EXTERN_METHOD(getSelectedHabitIds:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setSelectedYearHabitId:(NSString *)id)
RCT_EXTERN_METHOD(getSelectedYearHabitId:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(updateWidgetData:(NSString *)jsonString)
RCT_EXTERN_METHOD(reloadWidget)
RCT_EXTERN_METHOD(setRingsHabitIds:(NSArray<NSString *> *)ids)
RCT_EXTERN_METHOD(getRingsHabitIds:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(consumePendingToggles:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
