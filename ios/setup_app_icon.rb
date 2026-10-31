#!/usr/bin/env ruby
# Registers the AppIconModule sources and the alternate-app-icon build
# settings on the main app target. Idempotent — safe to re-run.
require 'xcodeproj'

PROJECT_PATH = 'Habita.xcodeproj'
MAIN_TARGET_NAME = 'Habita'
MODULE_GROUP = 'AppIconModule'
MODULE_FILES = %w[AppIconModule.swift AppIconModule.m].freeze
ALTERNATE_ICON_NAME = 'AppIcon-Dark'

project = Xcodeproj::Project.open(PROJECT_PATH)
main_target = project.targets.find { |t| t.name == MAIN_TARGET_NAME }
raise "Main target '#{MAIN_TARGET_NAME}' not found!" unless main_target

# ── 1. Add AppIconModule sources to the main target ──────────────
module_group = project.main_group.find_subpath(MODULE_GROUP, true)
module_group.set_source_tree('SOURCE_ROOT')
module_group.set_path(MODULE_GROUP)

MODULE_FILES.each do |filename|
  existing = module_group.files.find { |f| f.path == filename }
  ref = existing || module_group.new_file(filename)

  already_compiled = main_target.source_build_phase.files.any? do |bf|
    bf.file_ref == ref
  end
  next if already_compiled

  main_target.source_build_phase.add_file_reference(ref)
  puts "✓ Added #{filename} to '#{MAIN_TARGET_NAME}' sources"
end

# ── 2. Alternate app icon build settings (asset-catalog route) ────
# actool turns the "Alternate App Icon Sets" names into the generated
# CFBundleAlternateIcons entries of the built Info.plist.
main_target.build_configurations.each do |config|
  config.build_settings['ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES'] =
    ALTERNATE_ICON_NAME
  config.build_settings['ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS'] =
    'YES'
  puts "✓ Set alternate icon build settings (#{config.name})"
end

project.save

puts
puts "✅ App icon setup complete!"
