import re

with open('src-tauri/src/lib.rs', 'r') as f:
    content = f.read()

pattern = r'''#\[tauri::command\(rename_all = "camelCase"\)\]
fn delete_slot\(app: tauri::AppHandle, slot_id: String\) -> Result<\(\), String> \{
  let path = slot_path\(&app, &slot_id\)\?;

  match fs::remove_file\(path\) \{
    Ok\(_\) => Ok\(\(\)\),
    Err\(err\) if err\.kind\(\) == std::io::ErrorKind::NotFound => Ok\(\(\)\),
    Err\(err\) => Err\(err\.to_string\(\)\),
  \}
\}'''

replacement = '''#[tauri::command(rename_all = "camelCase")]
fn delete_slot(app: tauri::AppHandle, slot_id: String) -> Result<(), String> {
  let path = slot_path(&app, &slot_id)?;

  match fs::remove_file(path) {
    Ok(_) => Ok(()),
    Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
    Err(err) => Err(err.to_string()),
  }
}

#[tauri::command(rename_all = "camelCase")]
fn file_exists(path: String) -> Result<bool, String> {
  Ok(PathBuf::from(path).exists())
}'''

content = re.sub(pattern, replacement, content)

content = content.replace("delete_slot\n    ])", "delete_slot,\n      file_exists\n    ])")

with open('src-tauri/src/lib.rs', 'w') as f:
    f.write(content)
