const vscode = require('vscode');
const fs = require("fs");
const path = require("path");


function activate(context) {
	const appDir = require.main ? path.dirname(require.main.filename) : globalThis._VSCODE_FILE_ROOT;
	if (!appDir) return vscode.window.showInformationMessage("Unable to locate VS Code installation path");
	const extDir = path.resolve(__dirname).replace(/\\/g, "/"); // Convert backslashes to forward slashes

	const base = path.join(appDir, "vs", "code");
	let htmlFile = path.join(base, "electron-sandbox", "workbench", "workbench.html");
	if (!fs.existsSync(htmlFile)) return vscode.window.showInformationMessage("Unable to locate workbench.html");

	async function installEmoji() {
		let html = await fs.promises.readFile(htmlFile, "utf-8");
		html = html.replace(/<!-- !! NOTO-EMOJI-START !! -->[\s\S]*?<!-- !! NOTO-EMOJI-END !! -->\n*/, "");

		const styles = `
			<style>
				@font-face {
					font-family: 'Noto Color Emoji';
					src: url('vscode-file://vscode-app/${extDir}/NotoColorEmoji-Regular.ttf') format('truetype');
				}

				@font-face {
					font-family: 'Noto Emoji';
					src: url('vscode-file://vscode-app/${extDir}/NotoEmoji-VariableFont_wght') format('truetype');
				}
			</style>
		`;
		html = html.replace(/(<\/html>)/, `<!-- !! NOTO-EMOJI-START !! -->\n${styles}\n<!-- !! NOTO-EMOJI-END !! -->\n</html>`);
		
		await fs.promises.writeFile(htmlFile, html, "utf-8");
		vscode.window.showInformationMessage("Noto Emoji installed. Restart VS Code to apply changes.");
	}

	async function uninstallEmoji() {
		let html = await fs.promises.readFile(htmlFile, "utf-8");
		html = html.replace(/<!-- !! NOTO-EMOJI-START !! -->[\s\S]*?<!-- !! NOTO-EMOJI-END !! -->\n*/, "");
		await fs.promises.writeFile(htmlFile, html, "utf-8");
		vscode.window.showInformationMessage("Noto Emoji removed. Restart VS Code to apply changes.");
	}

	installEmoji()
	vscode.window.showInformationMessage("Minimal Noto Emoji Extension Activated");
}

function deactivate() {uninstallEmoji();}

module.exports = {
	activate,
	deactivate
}
