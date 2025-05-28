### [Visual Studio Code](https://code.visualstudio.com/)

#### Install using Command Palette

1.  Go to `View -> Command Palette` or press `Ctrl+Shift+P`
2.  Then enter `Install Extension`
3.  Write `Falcon Relaxing-Eyes Themes`
4.  Select it or press Enter to install

#### Install using Git

If you are a git user, you can install the theme and keep up to date by cloning the repo:

```bash
git clone https://github.com/panxiaoan/falcon-vscode-themes.git
cd ./falcon-vscode-themes

# 安装依赖
npm install

# 编译、打包、本地安装
npx vsce package && code --install-extension *.vsix

# 发布
vsce login panxiaoan
vsce publish

# 更新版本，执行命令后会自动更新 package.json 中的版本号
vsce publish major | minor | path
```

#### Activating theme

Run Visual Studio Code. The Falcon VS Code Themes will be available from `File -> Preferences -> Color Theme` dropdown menu.
