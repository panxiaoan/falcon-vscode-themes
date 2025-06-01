#!/bin/bash

vsce package -o themes-falcon-vscode.vsix && /Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --install-extension *.vsix --force