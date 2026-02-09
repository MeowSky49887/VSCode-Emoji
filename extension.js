const vscode = require('vscode');
const fs = require("fs");
const path = require("path");
const { Window } = require("happy-dom");

const appDir = require.main ? path.dirname(require.main.filename) : globalThis._VSCODE_FILE_ROOT;
if (!appDir) return vscode.window.showInformationMessage("Unable to locate VS Code installation path. Please Reinstall VSCode.");

const base = path.join(appDir, "vs", "code");
let htmlFile = path.join(base, "electron-browser", "workbench", "workbench.html");
if (!fs.existsSync(htmlFile)) return vscode.window.showInformationMessage("Unable to locate workbench.html. Please Reinstall VSCode.");
	
async function activate(context) {
	async function installEmoji() {
		const backupFile = path.join(base, "electron-browser", "workbench", "workbench.html.backup");
	
		let html = await fs.promises.readFile(htmlFile, "utf-8");
	
		if (!fs.existsSync(backupFile)) {
			await fs.promises.rename(htmlFile, backupFile);
			vscode.window.showInformationMessage("Original workbench.html backed up.");
		}
		
		const window = new Window();
		window.document.write(html);
	
		const metaCSP = window.document.querySelector('meta[http-equiv="Content-Security-Policy"]');
		const orgCSP = metaCSP.getAttribute("content").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
		const addCSP = "style-src https://fonts.googleapis.com; font-src https://fonts.gstatic.com;";

		metaCSP.remove();
	
		let directives = new Map();
	
		orgCSP.split(";").forEach(rule => {
			let parts = rule.trim().split(/\s+/);
			if (parts.length > 1) directives.set(parts[0], new Set(parts.slice(1)));
		});
	
		addCSP.split(";").forEach(rule => {
			let parts = rule.trim().split(/\s+/);
			if (parts.length > 1) {
				if (!directives.has(parts[0])) {
					directives.set(parts[0], new Set());
				}
				parts.slice(1).forEach(value => directives.get(parts[0]).add(value));
			}
		});
	
		const newCSP = [...directives.entries()]
			.map(([key, values]) => `${key} ${[...values].join(" ")}`)
			.join("; ");
	
		const newMetaCSP = `<meta http-equiv="Content-Security-Policy" content="${newCSP}">`;
	
		const styles = `
		<!-- !! NOTO-EMOJI-START !! -->
		${newMetaCSP}
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Emoji&display=swap" rel="stylesheet">
		<!-- !! NOTO-EMOJI-END !! -->`;
	
		// Instead of insertBefore, append the styles directly
		const headElement = window.document.querySelector('head');
		headElement.innerHTML = `${styles}\n` + headElement.innerHTML;

		await fs.promises.writeFile(htmlFile, html.replace(/<head>[\s\S]*<\/head>/, headElement.outerHTML), "utf-8");
	
		vscode.window.showInformationMessage("Noto Emoji installed. Restart VS Code to apply changes.");
	}

	const unicode = await fetchEmojis();

	let disposable = vscode.commands.registerCommand('notoEmoji.open', () => {
		const panel = vscode.window.createWebviewPanel(
			'emojiOnScreen',
			'Emoji On-Screen Keyboard',
			vscode.ViewColumn.Beside,  // Opens floating beside the editor
			{ enableScripts: true }
		);
	
		panel.webview.html = getWebviewContent(unicode, panel);
	});
	
	context.subscriptions.push(disposable);

	await installEmoji()
	vscode.window.showInformationMessage("Minimal Noto Emoji Extension Activated.");
}

function getWebviewContent(unicode, panel) {
	let html = `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Emoji Categories</title>
				<link rel="preconnect" href="https://fonts.googleapis.com">
				<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
				<link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap" rel="stylesheet">
				<style>
					* {
						font-family: "Noto Color Emoji", sans-serif;
						font-weight: 400;
						font-style: normal;
					}
					body {
						height: 100vh;
						width: 100vw;
					}
					.tab-button {
						font-size: 24px; 
						padding: 16px; 
						cursor: pointer;
						background: none;
						border: 0;
					}
					.tab-select {
						background-color: rgba(0, 0, 0, 0.5);
					}
				</style>
			</head>
			<body>
				<div id="emoji-container" style="display: grid; grid-template-rows: 12.5% 87.5%; width: 100%; height: 100%;">
	`
	html += `<div style="display: flex; border-bottom-style: solid; border-bottom-width: 1px; overflow-x: auto; height: 80px;">`;
	var i = 0;
	for (const [group, subgroups] of Object.entries(unicode)) {
		let firstSubgroup = Object.keys(subgroups)[0];
		let firstEmoji = subgroups[firstSubgroup][0];
		html += `<button onclick="showTab(${i})" class="tab-button ${i === 0 ? 'tab-select' : ''}" title="${group}">${firstEmoji}</button>`;
		i++;
	}
	html += `</div>`;

	var i = 0;
	for (const [group, subgroups] of Object.entries(unicode)) {
		html += `<div class="tab-content" style="display: ${i === 0 ? 'block' : 'none'}; overflow: auto; padding: 16px;"><h1 style="font-size: 20px; text-align: center; margin-bottom: 16px;">${group}</h1>`;
		for (const [subgroup, emojis] of Object.entries(subgroups)) {
			html += `<h2 style="font-size: 16px; margin-top: 16px;">${subgroup}</h2>`;
			html += `<div style="display: flex; flex-wrap: wrap; gap: 8px; padding: 8px;">`;
			for (const emoji of emojis) {
				html += `<button style="font-size: 24px; padding: 8px; background: none; border: 0;" onclick="use(this)">${emoji}</button>`;
			}
			html += `</div>`;
		}
		html += `</div>`;
		i++;
	}
	html += `
				</div>
				<script>
					function use(element) {
						const range = document.createRange();
						const selection = window.getSelection();
						selection.removeAllRanges();
						range.selectNodeContents(element);
						selection.addRange(range);

						navigator.clipboard.writeText(element.innerText)
					}

					function showTab(tabIndex) {
						document.querySelectorAll('.tab-content').forEach((tab, index) => {
							tab.style.display = (index === tabIndex) ? 'block' : 'none';
						});
						document.querySelectorAll('.tab-button').forEach((btn, index) => {
							btn.classList.toggle('tab-select', index === tabIndex);
						});
					}
				</script>
			</body>
		</html>
	`;

	return html
}

async function fetchEmojis() {
	const response = await fetch("https://unicode.org/Public/emoji/16.0/emoji-test.txt");
	const text = await response.text();
	const lines = text.split("\n");

	let unicode = {};
	let currentGroup = null;
	let currentSubgroup = null;

	for (let line of lines) {
		if (line.startsWith("# group: ")) {
			currentGroup = line.replace("# group: ", "").trim();
			unicode[currentGroup] = {};
		} else if (line.startsWith("# subgroup: ")) {
			currentSubgroup = line.replace("# subgroup: ", "").trim();
			if (currentGroup) {
				unicode[currentGroup][currentSubgroup] = [];
			}
		} else if (line && !line.startsWith("#") && line.includes("fully-qualified")) {
			let codepoints = line.split(";")[0].trim();
			let emoji = codepoints.split(" ").map(cp => String.fromCodePoint(parseInt(cp, 16))).join("");
			if (currentGroup && currentSubgroup) {
				unicode[currentGroup][currentSubgroup].push(emoji);
			}
		}
	}

	unicode = Object.fromEntries(
		Object.entries(unicode).map(([group, subgroups]) => [
			group,
			Object.fromEntries(Object.entries(subgroups).filter(([_, emojis]) => emojis.length))
		]).filter(([_, subgroups]) => Object.keys(subgroups).length)
	);

	return unicode
}

module.exports = {
	activate
}
