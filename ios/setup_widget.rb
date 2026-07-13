#!/usr/bin/env ruby
require 'xcodeproj'

PROJECT_PATH = 'Habita.xcodeproj'
APP_GROUP_ID = 'group.com.codethenic.habita.widget'
MAIN_TARGET_NAME = 'Habita'
WIDGET_TARGET_NAME = 'HabitTrackerWidget'
WIDGET_PRODUCT_NAME = 'HabitTrackerWidget'
WIDGET_BUNDLE_ID = 'com.codethenic.habita.widget'

project = Xcodeproj::Project.open(PROJECT_PATH)
main_target = project.targets.find { |t| t.name == MAIN_TARGET_NAME }
raise "Main target '#{MAIN_TARGET_NAME}' not found!" unless main_target

# ── 1. Add WidgetModule files to main target ──────────────────────
module_group = project.main_group.find_subpath('WidgetModule', true)
module_group.set_source_tree('SOURCE_ROOT')
module_group.set_path('WidgetModule')

swift_ref = module_group.new_file('WidgetModule.swift')
objc_ref  = module_group.new_file('WidgetModule.m')

main_target.source_build_phase.add_file_reference(swift_ref)
main_target.source_build_phase.add_file_reference(objc_ref)

puts "✓ Added WidgetModule files to '#{MAIN_TARGET_NAME}'"

# ── 2. Add App Groups entitlement to main target ──────────────────
main_target.build_configurations.each do |config|
  entitlements = config.build_settings['CODE_SIGN_ENTITLEMENTS']
  unless entitlements
    entitlements_path = 'HabitTracker/Habita.entitlements'
    config.build_settings['CODE_SIGN_ENTITLEMENTS'] = entitlements_path
    puts "  Set CODE_SIGN_ENTITLEMENTS to #{entitlements_path} for #{config.name}"
  end
end

# ── 3. Create HabitTrackerWidget extension target ─────────────────
widget_group = project.main_group.find_subpath('HabitTrackerWidget', true)
widget_group.set_source_tree('SOURCE_ROOT')
widget_group.set_path('HabitTrackerWidget')

# Add existing files to group
widget_group.new_file('HabitTrackerWidgetBundle.swift')
widget_group.new_file('WeekHeatmapWidget.swift')
plist_ref = widget_group.new_file('Info.plist')

# Create product reference for widget
products_group = project.main_group.find_subpath('Products')
widget_product = products_group.new_product_ref_for_target(WIDGET_PRODUCT_NAME, :app_extension)
widget_product.name = "#{WIDGET_PRODUCT_NAME}.appex"

# Create the native target
widget_target = project.new_target(
  :app_extension,
  WIDGET_TARGET_NAME,
  :ios,
  'com.apple.product-type.app-extension',
  nil  # product reference
)

# Configure the widget target
widget_target.product_reference = widget_product
widget_target.product_name = WIDGET_PRODUCT_NAME

# Remove default sources and add our files
widget_target.source_build_phase.files.clear if widget_target.source_build_phase.files
widget_target.source_build_phase.add_file_reference(
  widget_group.files.find { |f| f.path == 'HabitTrackerWidgetBundle.swift' }
)
widget_target.source_build_phase.add_file_reference(
  widget_group.files.find { |f| f.path == 'WeekHeatmapWidget.swift' }
)

# Add Info.plist
widget_target.build_configurations.each do |config|
  config.build_settings['INFOPLIST_FILE'] = 'HabitTrackerWidget/Info.plist'
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = WIDGET_BUNDLE_ID
  config.build_settings['PRODUCT_NAME'] = WIDGET_PRODUCT_NAME
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['DEVELOPMENT_TEAM'] = main_target.build_settings(config.name)['DEVELOPMENT_TEAM']
  config.build_settings['LD_RUNPATH_SEARCH_PATHS'] = [
    "$(inherited)",
    "@executable_path/Frameworks",
    "@executable_path/../../Frameworks"
  ]
  config.build_settings['ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS'] = 'NO'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  config.build_settings['TARGETED_DEVICE_FAMILY'] = main_target.build_settings(config.name)['TARGETED_DEVICE_FAMILY']
  config.build_settings['APP_GROUP_IDENTIFIER'] = APP_GROUP_ID
end

puts "✓ Created '#{WIDGET_TARGET_NAME}' extension target"

# ── 4. Create entitlements file for main target ───────────────────
entitlements_path = File.join(File.dirname(PROJECT_PATH), 'HabitTracker', 'Habita.entitlements')
unless File.exist?(entitlements_path)
  entitlements_content = <<~PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <false/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.codethenic.habita</string>
    </array>
</dict>
</plist>
  PLIST
  File.write(entitlements_path, entitlements_content)
  puts "✓ Created Habita.entitlements"
end

# ── 5. Create entitlements for widget target ─────────────────────
widget_entitlements_path = File.join(File.dirname(PROJECT_PATH), 'HabitTrackerWidget', 'HabitTrackerWidget.entitlements')
unless File.exist?(widget_entitlements_path)
  widget_entitlements_content = <<~PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <false/>
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.codethenic.habita.widget</string>
    </array>
</dict>
</plist>
  PLIST
  File.write(widget_entitlements_path, widget_entitlements_content)
  puts "✓ Created HabitTrackerWidget.entitlements"
end

# ── 6. Ensure widget extension is in the project targets list ─────
unless project.targets.include?(widget_target)
  project.targets << widget_target
  puts "✓ Added widget target to project targets"
end

# ── 7. Add widget as target dependency of main target ────────────
unless main_target.dependencies.any? { |d| d.target == widget_target }
  main_target.add_dependency(widget_target)
  puts "✓ Added #{WIDGET_TARGET_NAME} as target dependency of #{MAIN_TARGET_NAME}"
end

# ── 8. Add "Embed App Extensions" build phase to main target ─────
embed_phase = main_target.build_phases.find do |p|
  p.isa == 'PBXCopyFilesBuildPhase' &&
    p.name == 'Embed App Extensions'
end
unless embed_phase
  embed_phase = main_target.new_copy_files_build_phase('Embed App Extensions')
  embed_phase.dst_subfolder_spec = '13'
  embed_phase.dst_path = ''
  puts "✓ Created 'Embed App Extensions' build phase"
end

# Add the widget .appex product to the embed phase
widget_product_file = embed_phase.files.find do |f|
  f.file_ref&.path == "#{WIDGET_PRODUCT_NAME}.appex"
end
unless widget_product_file
  # Find the widget product reference
  product_ref = project.products.find { |p| p.path == "#{WIDGET_PRODUCT_NAME}.appex" }
  if product_ref
    build_file = embed_phase.add_file_reference(product_ref)
    build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] } if build_file
    puts "✓ Added #{WIDGET_PRODUCT_NAME}.appex to Embed App Extensions"
  end
end

# ── 9. Save ───────────────────────────────────────────────────────
project.save

puts
puts "✅ Setup complete!"
puts
puts "⚠️  IMPORTANT: Open #{PROJECT_PATH.split('/').last} in Xcode"
puts "   File → Project Settings → Derived Data → choose 'Workspace-relative'"
puts
puts "📋 Manual steps remaining in Xcode:"
puts "   1. Select the '#{MAIN_TARGET_NAME}' target → Signing & Capabilities"
puts "     → + Capability → 'App Groups' → add '#{APP_GROUP_ID}'"
puts "   2. Select the '#{WIDGET_TARGET_NAME}' target → Signing & Capabilities"
puts "     → + Capability → 'App Groups' → add '#{APP_GROUP_ID}'"
puts "   3. In the '#{WIDGET_TARGET_NAME}' target → Signing"
puts "     → Set your Development Team"
puts "   4. Build → Run (the widget will appear after the app launches)"
