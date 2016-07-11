xtk.load('chrome://less/content/less/less.min.js');

/**
 * Namespaces
 */
if (typeof(extensions) === 'undefined') extensions = {};
if (typeof(extensions.less) === 'undefined') extensions.less = {
	version: '2.1.3'
};
(function() {
	var notify = require("notify/notify"),
		$ = require("ko/dom"),
		self = this,
		search = false,
		editor = require("ko/editor"),
		prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService).getBranch("extensions.less.");


	if (!('extensions' in ko)) ko.extensions = {};
	var myExt = "lesscompiler@komodoeditide.com";
	if (!(myExt in ko.extensions)) ko.extensions[myExt] = {};
	if (!('myapp' in ko.extensions[myExt])) ko.extensions[myExt].myapp = {};
	var lessData = ko.extensions[myExt].myapp;

	if (extensions.less && extensions.less.onKeyPress) {
		ko.views.manager.topView.removeEventListener(
			'keypress',
			extensions.less._onKeyPress, true
		);

		window.removeEventListener("komodo-post-startup", self._StartUpAction, false);
		window.removeEventListener("view_opened", self.getVars, false);
		window.removeEventListener("focus", self._focusAction, false);
		window.removeEventListener("file_saved", self._AfterSafeAction, false);
		window.removeEventListener("current_view_changed", self._updateView, false);
	}



	this.compileFile = function(showWarning, compress, getVars) {
		showWarning = showWarning || false;
		compress = compress || false;
		getVars = getVars || false;

		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			fileContent = self._getContent(d),
			file = fileContent.file,
			buffer = fileContent.buffer,
			base = fileContent.base,
			path = fileContent.path,
			compilerEnabled = prefs.getBoolPref('compilerEnabled');

		if (!compilerEnabled && !getVars) {
			return;
		}

		if (!file || !path) {
			return;
		}
		
		if (file.ext == '.less') {
			if (getVars) {
				self._notifcation('LESS: Getting LESS vars');
			}

			outputLess = self._proces_less(path, base, buffer);
			if (getVars) {
				var allVars = self._getVars(outputLess);
				lessData.vars = allVars;
				if (lessData.vars !== undefined) { // TODO clean up
				} else {
					lessData.vars = '';
					self._notifcation('LESS: No LESS vars found');
				}

			} else {
				less.render(outputLess, {
						compress: compress
					})
					.then(function(output) {
							var newFilename = path.replace('.less', '.css');

							self._saveFile(newFilename, output.css);
							self._notifcation('LESS: File saved');
							self._updateStatusBar();
						},
						function(error) {
							self._notifcation('LESS ERROR: ' + error, true);
							self._updateStatusBar('LESS ERROR: ' + error);
						});
			}
		} else {
			return;
		}
	};

	this.compileCompressFile = function(showWarning) {
		this.compileFile(showWarning, true);
	};

	this.compileBuffer = function(compress) {
		compress = compress || false;

		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			buffer = d.buffer,
			base = (file) ? file.baseName : null,
			path = (file) ? file.URI : null;

		if (!file || !path) {
			self._notifcation('LESS: Please save the file first', true);
			return;
		}

		outputLess = self._proces_less(path, base, buffer);

		less.render(outputLess, {
				compress: compress
			})
			.then(function(output) {
					d.buffer = output.css;
					self._notifcation('LESS: Compiled LESS buffer');
					self._updateStatusBar();
				},
				function(error) {
					self._notifcation('LESS ERROR: ' + error, true);
					self._updateStatusBar('LESS ERROR: ' + error);
				});
	};

	this.compileCompressBuffer = function() {
		this.compileBuffer(true);
	}

	this.compileSelection = function(compress) {
		compress = compress || false;

		var view = ko.views.manager.currentView,
			scimoz = view.scintilla.scimoz;
		text = scimoz.selText,
			d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			base = (file) ? file.baseName : null,
			path = (file) ? file.URI : null;

		if (!file || !path) {
			self._notifcation('LESS: Please save the file first', true);
			return;
		}

		outputLess = self._proces_less(path, base, text);

		less.render(outputLess, {
				compress: compress
			})
			.then(function(output) {
					var css = output.css;
					scimoz.replaceSel(css);
					self._notifcation('LESS: Compiled LESS selection');
					self._updateStatusBar();
				},
				function(error) {
					self._notifcation('LESS ERROR: ' + error, true);
					self._updateStatusBar('LESS ERROR: ' + error);
				});
	};

	this.compileCompressSelection = function() {
		this.compileSelection(true);
	}

	this.getVars = function(search) {
		search = search || false;
		var useFileWatcher = prefs.getBoolPref('useFilewatcher'),
			fileWatcher = prefs.getCharPref('fileWatcher'),
			d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			path = (file) ? file.URI : null;

		if (!file) {
			return false;
		}

		if (file.ext === '.less') {
			if (useFileWatcher) {
				var parser = ko.uriparse;
				if (parser.displayPath(path) === parser.displayPath(fileWatcher)) {
					self.compileFile(false, false, true);
				} else if (search) {
					//self._getVarsFromBuffer(); TODO only collect from current buffer
					self.compileFile(false, false, true);
				}
			} else {
				self.compileFile(false, false, true);
			}
		}
		return false;
	}

	this._getContent = function(doc) {
		var file = doc.file,
			buffer = doc.buffer,
			base = (file) ? file.baseName : null,
			filePath = (file) ? file.URI : null,
			path = '';
		output = {};


		if (prefs.getBoolPref('useFileScopes')) {
			var outputfile01 = prefs.getCharPref('outputfile01'),
				outputfile02 = prefs.getCharPref('outputfile02'),
				outputfile03 = prefs.getCharPref('outputfile03'),
				includeLess01Folder01 = prefs.getCharPref('includeLess01Folder01').length > 0 ? prefs.getCharPref('includeLess01Folder01') : null,
				includeLess01Folder02 = prefs.getCharPref('includeLess01Folder02').length > 0 ? prefs.getCharPref('includeLess01Folder02') : null,
				includeLess01Folder03 = prefs.getCharPref('includeLess01Folder03').length > 0 ? prefs.getCharPref('includeLess01Folder03') : null,
				includeLess02Folder01 = prefs.getCharPref('includeLess02Folder01').length > 0 ? prefs.getCharPref('includeLess02Folder01') : null,
				includeLess02Folder02 = prefs.getCharPref('includeLess02Folder02').length > 0 ? prefs.getCharPref('includeLess02Folder02') : null,
				includeLess02Folder03 = prefs.getCharPref('includeLess02Folder03').length > 0 ? prefs.getCharPref('includeLess02Folder03') : null,
				includeLess03Folder01 = prefs.getCharPref('includeLess03Folder01').length > 0 ? prefs.getCharPref('includeLess03Folder01') : null,
				includeLess03Folder02 = prefs.getCharPref('includeLess03Folder02').length > 0 ? prefs.getCharPref('includeLess03Folder02') : null,
				includeLess03Folder03 = prefs.getCharPref('includeLess03Folder03').length > 0 ? prefs.getCharPref('includeLess03Folder03') : null,
				parser = ko.uriparse
			displayPath = parser.displayPath(filePath);

			if (outputfile01.length > 0) {
				if (displayPath.indexOf(parser.displayPath(includeLess01Folder01)) !== -1) {
					path = outputfile01;
				} else if (displayPath.indexOf(parser.displayPath(includeLess01Folder02)) !== -1) {
					path = outputfile01;
				} else if (displayPath.indexOf(parser.displayPath(includeLess01Folder03)) !== -1) {
					path = outputfile01;
				}
			}

			if (outputfile02.length > 0) {
				if (displayPath.indexOf(parser.displayPath(includeLess02Folder01)) !== -1) {
					path = outputfile02;
				} else if (displayPath.indexOf(parser.displayPath(includeLess02Folder02)) !== -1) {
					path = outputfile02;
				} else if (displayPath.indexOf(parser.displayPath(includeLess02Folder03)) !== -1) {
					path = outputfile02;
				}
			}

			if (outputfile03.length > 0) {
				if (displayPath.indexOf(parser.displayPath(includeLess03Folder01)) !== -1) {
					path = outputfile03;
				} else if (displayPath.indexOf(parser.displayPath(includeLess03Folder02)) !== -1) {
					path = outputfile03;
				} else if (displayPath.indexOf(parser.displayPath(includeLess03Folder03)) !== -1) {
					path = outputfile03;
				}
			}

		} else if (prefs.getBoolPref('useFilewatcher')) {
			path = prefs.getCharPref('fileWatcher');
			base = path.substr(self._last_slash(path) + 1, path.lenght),
				buffer = self._readFile(path, '')[0];
		}

		if (!path) {
			path = filePath;
		} else {
			base = path.substr(self._last_slash(path) + 1, path.lenght);
			buffer = self._readFile(path, '')[0];
		}

		output.file = file;
		output.buffer = buffer;
		output.base = base;
		output.path = path;

		return output;
	}

	this._getPath = function(path) {
		if (prefs.getBoolPref('useFileScopes')) {

		} else if (prefs.getBoolPref('useFilewatcher')) {
			path = prefs.getCharPref('fileWatcher');
		}

		return path;
	}

	this._getBase = function(base) {
		if (prefs.getBoolPref('useFileScopes')) {

		} else if (prefs.getBoolPref('useFilewatcher')) {
			var path = prefs.getCharPref('fileWatcher');
			base = path.substr(self._last_slash(path) + 1, path.lenght);
		}

		return base;
	}

	this._getBuffer = function(buffer) {
		if (prefs.getBoolPref('useFileScopes')) {

		} else if (prefs.getBoolPref('useFilewatcher')) {
			var path = prefs.getCharPref('fileWatcher');
			buffer = self._readFile(path, '')[0];
		}

		return buffer;
	}

	this.enableFileWatcher = function() {
		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			path = (file) ? file.URI : null;


		if (!file) {
			self._notifcation('LESS: Please save the file first', true);
			return;
		}

		if (file.ext == '.less') {
			if (prefs.getBoolPref('useFilewatcher') === false) {
				prefs.setBoolPref('useFilewatcher', true);
			}

			prefs.setCharPref('fileWatcher', path);
			self._notifcation('LESS: file watcher enabled');
			self._updateStatusBar();
		} else {
			self._notifcation('LESS: Please select a LESS file', true);
			self._updateStatusBar('LESS ERROR: ' + error);
			return;
		}
	}

	this.disableFileWatcher = function() {
		if (prefs.getBoolPref('useFilewatcher')) {
			prefs.setBoolPref('useFilewatcher', false);
		}

		prefs.setCharPref('fileWatcher', '');
		self._updateStatusBar();
		self._notifcation('LESS: file watcher disabled');
	}

	this.enableCompiler = function() {
		prefs.setBoolPref('compilerEnabled', true);
		self._updateStatusBar();
		self._notifcation('LESS: Compiler Enabled');
	}

	this.disableCompiler = function() {
		prefs.setBoolPref('compilerEnabled', false);
		self._updateStatusBar();
		self._notifcation('LESS: Compiler disabled');
	}
	
	this.enableFilescopes = function() {
		prefs.setBoolPref('useFileScopes', true);
		self._updateStatusBar();
		self._notifcation('LESS: File scopes Enabled');
	}

	this.disableFileScopes = function() {
		prefs.setBoolPref('useFileScopes', false);
		self._updateStatusBar();
		self._notifcation('LESS: File scopes disabled');
	}

	this._process_imports = function(imports, rootPath) {

		var buffer = '',
			newContent = '',
			matchImports = /(@import\s*['"][^"]+['"];|@import\s+\W[^"]+\W\s+['"][^"]+["'];)/,
			matchValue = /['"](.*?)['"]/,
			nameHasDot = /[a-z0-9][.][a-z]/i,
			quotes = /['"]+/g;

		if (imports !== -1) {
			imports.forEach(function(value, i) {
				//if is regular @import
				if (value.match(/@import\s*['"][^"]+['"];/) !== null) {
					if (value.match(matchValue) !== null) {
						var xf = value.match(matchValue),
							fileName = xf.toString().split(',')[1].replace(quotes, '');
						if (fileName.match(nameHasDot) == null) {
							fileName = fileName + '.less';
						}
						newContent = self._readFile(rootPath, fileName);
						buffer = buffer + newContent[0];

						if (buffer.toString().match(matchImports) !== null) {
							var cleanLess = self._strip_comments(buffer);
							newImport = self._split_on_imports(cleanLess);
							buffer = self._process_imports(newImport, newContent[1]);
						}
					}
				}

				//if (option) @import process
				if (value.match(/@import\s+\W[^"]+\W\s+['"][^"]+["'];/) !== null) {
					var type = value.match(/\(([^\)]+)\)/).toString().split(',')[1];

					switch (type) {
						case 'css':
							buffer = buffer + value;
							break;
						case 'less':
							if (value.match(matchValue) !== null) {
								var xf = value.match(matchValue),
									fileName = xf.toString().split(',')[1].replace(quotes, '');
								if (fileName.match(nameHasDot) == null) {
									fileName = fileName + '.less';
								}
								newContent = self._readFile(rootPath, fileName);
								buffer = buffer + newContent[0];

								if (buffer.toString().match(matchImports) !== null) {
									var cleanLess = self._strip_comments(buffer);
									newImport = self._split_on_imports(cleanLess);
									buffer = self._process_imports(newImport, newContent[1]);
								}
							}
							break;
						case 'optional':
						case 'inline':
						case 'reference':
						case 'multiple':
							self._notifcation('@import (' + type + ') is not supported, file is treated as LESS');
							if (value.match(matchValue) !== null) {
								var xf = value.match(matchValue),
									fileName = xf.toString().split(',')[1].replace(quotes, '');
								if (fileName.match(nameHasDot) == null) {
									fileName = fileName + '.less';
								}
								newContent = self._readFile(rootPath, fileName);
								buffer = buffer + newContent[0];

								if (buffer.toString().match(matchImports) !== null) {
									var cleanLess = self._strip_comments(buffer);
									newImport = self._split_on_imports(cleanLess);
									buffer = self._process_imports(newImport, newContent[1]);
								}
							}
							break;
					}

				}
				//if isn't @import it's less/css
				if (value.match(/@import\s*['"][^"]+['"];/) == null && value.match(/@import\s+\W[^"]+\W\s+['"][^"]+["'];/) == null) {
					buffer = buffer + value;
				}
			});
		}

		return buffer;
	}

	this._get_imports = function(content) {
		var cleanLess = self._strip_comments(content),
			newImports = self._split_on_imports(cleanLess);
		return newImports;
	}

	this._proces_less = function(path, base, buffer) {
		var rootPath = path.replace(base, '');


		var lessCss = String(buffer),
			LESS = '';

		less_imports = self._get_imports(lessCss);
		LESS = self._process_imports(less_imports, rootPath);

		return LESS;
	}

	this._strip_comments = function(string) {
		var patern = /\/\/@import\s+['"][^']+['"];|\/\/@import\s+\W[^"]+\W\s+['"][^";]+["'];/g;
		return string.toString().replace(patern, '');
	}

	this._split_on_imports = function(cleanless) {
		var patern = /(@import\s*['"][^"';]+['"];|@import\s+\W[^"]+\W\s+['"][^''";]+["'];)/g;
		return cleanless.split(patern);
	}

	this._saveFile = function(filepath, filecontent) {

		var file = Components
			.classes["@activestate.com/koFileEx;1"]
			.createInstance(Components.interfaces.koIFileEx);
		file.path = filepath;

		file.open('w');

		file.puts(filecontent);
		file.close();

		return;
	};

	this._readFile = function(root, filepath) {

		var fileUrl,
			fileName,
			fullUrl = root + filepath,
			newRoot = '',
			backPatern = /(\.\.\/|\.\.\\)+/;

		//figure out ftp path if ../ in path
		if (filepath.search(backPatern) !== -1) {

			var output = self._parse_backDirectories(fullUrl, filepath, root),
				fileName = output.fileName,
				fileUrl = output.fileUrl;

		} else {
			var fileName = '';

			fileUrl = self._parse_uri(fullUrl);
			fileName = fileUrl.substring(self._last_slash(fileUrl) + 1, fileUrl.length);
		}

		newRoot = fileUrl.replace(fileName, '');

		var reader = Components.classes["@activestate.com/koFileEx;1"]
			.createInstance(Components.interfaces.koIFileEx),
			output = [],
			placeholder;

		reader.path = fileUrl;

		try {
			reader.open("r");
			placeholder = reader.readfile();
			reader.close();
			output[0] = placeholder;
			output[1] = newRoot;

		} catch (e) {
			self._notifcation('LESS ERROR: Reading file: ' + fileUrl);
			self._updateStatusBar('LESS ERROR: Reading file: ' + fileUrl);
		}

		return output;
	}

	this._getVars = function(buffer) {
		var bufferVars = '',
			allVars,
			output = [];

		if (buffer.match(/@[a-z0-9_-]+:/i)) {
			bufferVars = buffer.match(/@[a-z0-9_-]+:[^;,\r\n]+/gi);
			allVars = bufferVars.toString().split(',');

			allVars.forEach(function(value, i) {
				var VarAndValues = value.split(':'),
					val = VarAndValues[0],
					comm = VarAndValues[1].replace(/^\s+/, '');
				if (!self._in_array(val, output)) {
					output.push({
						"value": val,
						"comment": comm
					});
				}
			})

			return JSON.stringify(output);
		}

	}

	this._getVarsFromBuffer = function() {
		d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			newVars = '',
			oldVars = lessData.vars;

		if (!d) {
			return false;
		}

		if (d.buffer.length > 0) {
			newVars = self._getVars(d.buffer);

			if (newVars.length > 0) {
				var allVars = oldVars.concat(newVars);
				lessData.vars = JSON.stringify(allVars);
			}

		}

		return false;
	}

	this._parse_backDirectories = function(fullUrl, filePath, root) {
		var url = self._parse_uri(fullUrl),
			backDirectorys = filePath.match(/\.\.\//g),
			fileName = url.substr(self._last_slash(url) + 1, url.length),
			fileBase = filePath.replace(/\.\.\//g, '');
			base = root;
			
		for (var x = 0; x < backDirectorys.length + 1; x++) {
			base = base.substr(0, self._last_slash(base));
			if (x === backDirectorys.length) {
				base = base + '/';
			}
		}
		
		return {
			fileUrl: base + fileBase,
			fileName: fileName
		};
	}

	this._in_array = function(search, array) {
		for (i = 0; i < array.length; i++) {
			if (array[i] == search) {
				return true;
			}
		}
		return false;
	}

	this._last_slash = function(uri) {
		if (/\//.test(uri)) {
			return uri.lastIndexOf('/')
		} else {
			return uri.lastIndexOf('\\')
		}
	}

	this._parse_uri = function(uri) {
		if (/\\/.test(uri)) {
			uri = uri.replace(/\//g, '\\');
			ko.uriparse.getMappedPath(uri);
		}

		return uri;
	}

	this._cleanUp = function() {

		if (prefs.getBoolPref('showWarning')) {
			var features = "chrome,titlebar,toolbar,centerscreen";
			window.openDialog('chrome://less/content/upgradeWarning.xul', "lessWarning", features);

			prefs.setBoolPref('showWarning', false);
		}

		if (prefs.getBoolPref('useFilewatcher') && !prefs.getBoolPref('useFileScopes')) {
			self._notifcation('LESS: File watcher is still enabled form last session or is enabled in a other window.');
		}
	}

	this._checkForSearch = function() {
		if (search) {
			self.getVars(true);
			search = false;
		}
	}
	
	this.addPanel = function(){
		ko.views.manager.currentView.setFocus();
		var view 	= $(require("ko/views").current().get()),
		LESSpanel	= $("<statusbarpanel id='statusbar-less' />");
		
		if (view === undefined) {
			return;
 		}
		
		view.findAnonymous("anonid", "statusbar-encoding").before(LESSpanel);
 	}

	this._updateView = function() {
		var wrapper = $('#less_wrapper');
		if (wrapper.length > 0) {
			wrapper.remove();
		}

		self._updateStatusBar();
	}

	this._calculateXpos = function() {
		var currentWindowPos = editor.getCursorWindowPosition(),
			windowX =+ currentWindowPos['x'],
			newToolbar = window.top.document.getElementById('toolbox_side'),
			leftSidebarWith =+ window.top.document.getElementById('workspace_left_area').clientWidth,
			totalLeftSidebarWidth =+ leftSidebarWith;
			
			if (newToolbar !== null) {
				totalLeftSidebarWidth = totalLeftSidebarWidth + newToolbar.clientWidth;
			}
			
		return windowX - totalLeftSidebarWidth;
	}

	this._calculateYpos = function() {
		var currentWindowPos = editor.getCursorWindowPosition(),
			view = $(require("ko/views").current().get()),
			windowY = +currentWindowPos['y'],
			docH = +document.height,
			adjustY =+ prefs.getIntPref('tooltipY'),
			leftH = +window.top.document.getElementById('workspace_left_area').clientHeight, //left pane
			menuH = +window.top.document.getElementById('toolbox_main').clientHeight, // top menu
			tabs = window.top.document.getElementById('tabbed-view')._tabs,
			tabsH = +tabs.clientHeight, //tabs height
			tabsT = +tabs.clientTop, //tabs ofsset top
			breadcrumbBar = view.findAnonymous("anonid", "breadcrumbBarWrap"), // breadcrumbbar 
			breadcrumbBarH =+ breadcrumbBar._elements[0].clientHeight, // Todo check if not in bottom postion
			preCalc = docH - leftH + 1,
			topCalc = (menuH + breadcrumbBarH + preCalc) - ( tabsH + tabsT );

		topCalc = topCalc + adjustY;
		
		return windowY - topCalc;
	}

	insertLessVar = function() {
		var scimoz = ko.views.manager.currentView.scimoz,
			currentLine =  scimoz.lineFromPosition(scimoz.currentPos),
			input = $('#less_auto');

		if (input.length > 0) {
			var val = input.value();

			if (val.length > 0) {
				scimoz.insertText(scimoz.currentPos, val);
				scimoz.gotoPos(scimoz.currentPos + val.length);
			}
			input.parent().remove();
			ko.views.manager.currentView.setFocus();
			
			setTimeout(function(){
				if (scimoz.lineFromPosition(scimoz.currentPos) > currentLine) {
					scimoz.homeExtend();
					scimoz.charLeftExtend();
					scimoz.replaceSel('');
				}
				
			}, 50);
		}
	}

	abortLessVarCompletion = function() {
		var comp = $('#less_wrapper');

		if (comp.length > 0) {
			comp.remove();
			ko.views.manager.currentView.setFocus();
		}
	}

	blurLessComletion = function() {
		clearLessCompletion = setTimeout(function() {
			abortLessVarCompletion();
		}, 1000);
	}

	focusLessCompletion = function() {
		if (typeof clearLessCompletion !== 'undefined') {
			clearTimeout(clearLessCompletion);
		}
	}

	this._autocomplete = function() {
		var completions = lessData.vars,
			popup = document.getElementById('less_wrapper'),
			autocomplete = document.createElement('textbox'),
			x = self._calculateXpos(),
			y = self._calculateYpos();

		if (popup == null) {
			popup = document.createElement('tooltip');
			popup.setAttribute('id', 'less_wrapper');
			autocomplete.setAttribute('id', 'less_auto');
			autocomplete.setAttribute('type', 'autocomplete');
			autocomplete.setAttribute('showcommentcolumn', 'true');
			autocomplete.setAttribute('autocompletesearch', 'less-autocomplete');
			autocomplete.setAttribute('highlightnonmatches', 'true');
			autocomplete.setAttribute('ontextentered', 'insertLessVar()');
			autocomplete.setAttribute('ontextreverted', 'abortLessVarCompletion()');
			autocomplete.setAttribute('minresultsforpopup', '0');
			autocomplete.setAttribute('onblur', 'blurLessComletion()');
			autocomplete.setAttribute('onfocus', 'focusLessCompletion()');
			popup.appendChild(autocomplete);

			document.documentElement.appendChild(popup);
		}

		if (typeof completions === 'undefined') {
			self._notifcation('No vars set, going find some!');
			self.getVars();
			return false;
		}


		if (completions.length > 0) {
			autocomplete.setAttribute('autocompletesearchparam', completions);
			popup.openPopup(ko.views.manager.currentView, "after_pointer", x, y, false, false);
			autocomplete.focus();
			autocomplete.value = "@";
			autocomplete.open = true;
		}

	}

	this._updateStatusBar = function(message, error) {
		message = message || false;
		error = error || false;
		var label = 'Compiler Enabled',
			compileEnabled = prefs.getBoolPref('compilerEnabled');

		if (ko.views.manager.currentView == 'undefined') {
			return false;
		}

		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file;

		if (!file) {
			return;
		}

		if (file.ext === '.less') {

			$("#statusbar-less").remove();
			self.addPanel();

			if (prefs.getBoolPref('useFileScopes')) {
				var path = 'Outside file scope',
					filePath = (file) ? file.URI : null,
					outputfile01 = prefs.getCharPref('outputfile01'),
					outputfile02 = prefs.getCharPref('outputfile02'),
					outputfile03 = prefs.getCharPref('outputfile03'),
					includeLess01Folder01 = prefs.getCharPref('includeLess01Folder01').length > 0 ? prefs.getCharPref('includeLess01Folder01') : null,
					includeLess01Folder02 = prefs.getCharPref('includeLess01Folder02').length > 0 ? prefs.getCharPref('includeLess01Folder02') : null,
					includeLess01Folder03 = prefs.getCharPref('includeLess01Folder03').length > 0 ? prefs.getCharPref('includeLess01Folder03') : null,
					includeLess02Folder01 = prefs.getCharPref('includeLess02Folder01').length > 0 ? prefs.getCharPref('includeLess02Folder01') : null,
					includeLess02Folder02 = prefs.getCharPref('includeLess02Folder02').length > 0 ? prefs.getCharPref('includeLess02Folder02') : null,
					includeLess02Folder03 = prefs.getCharPref('includeLess02Folder03').length > 0 ? prefs.getCharPref('includeLess02Folder03') : null,
					includeLess03Folder01 = prefs.getCharPref('includeLess03Folder01').length > 0 ? prefs.getCharPref('includeLess03Folder01') : null,
					includeLess03Folder02 = prefs.getCharPref('includeLess03Folder02').length > 0 ? prefs.getCharPref('includeLess03Folder02') : null,
					includeLess03Folder03 = prefs.getCharPref('includeLess03Folder03').length > 0 ? prefs.getCharPref('includeLess03Folder03') : null,
					parser = ko.uriparse,
					displayPath = parser.displayPath(filePath);

				if (outputfile01.length > 0) {
					if (displayPath.indexOf(parser.displayPath(includeLess01Folder01)) !== -1) {
						path = outputfile01;
					} else if (displayPath.indexOf(parser.displayPath(includeLess01Folder02)) !== -1) {
						path = outputfile01;
					} else if (displayPath.indexOf(parser.displayPath(includeLess01Folder03)) !== -1) {
						path = outputfile01;
					} else if (displayPath.indexOf(parser.displayPath(outputfile01)) !== -1) {
						path = outputfile01;
					}
				}

				if (outputfile02.length > 0) {
					if (displayPath.indexOf(parser.displayPath(includeLess02Folder01)) !== -1) {
						path = outputfile02;
					} else if (displayPath.indexOf(parser.displayPath(includeLess02Folder02)) !== -1) {
						path = outputfile02;
					} else if (displayPath.indexOf(parser.displayPath(includeLess02Folder03)) !== -1) {
						path = outputfile02;
					} else if (displayPath.indexOf(parser.displayPath(outputfile02)) !== -1) {
						path = outputfile02;
					}
				}

				if (outputfile03.length > 0) {
					if (displayPath.indexOf(parser.displayPath(includeLess03Folder01)) !== -1) {
						path = outputfile03;
					} else if (displayPath.indexOf(parser.displayPath(includeLess03Folder02)) !== -1) {
						path = outputfile03;
					} else if (displayPath.indexOf(parser.displayPath(includeLess03Folder03)) !== -1) {
						path = outputfile03;
					} else if (displayPath.indexOf(parser.displayPath(outputfile03)) !== -1) {
						path = outputfile03
					}
				}

				if (path !== null) {
					if (path.length > 40) {
						path = '...' + path.substr(path.length - 40, path.length);
					}
					label = 'File Scope: ' + path;
				}


			} else if (prefs.getBoolPref('useFilewatcher')) {
				var fileWatcher = prefs.getCharPref('fileWatcher');

				if (fileWatcher.length > 40) {
					fileWatcher = '...' + fileWatcher.substr(fileWatcher.length - 40, fileWatcher.length);
				}
				label = 'File Watcher: ' + fileWatcher;
			}

			if (message) {
				label = message;
			}

			if (!compileEnabled) {
				label = 'Compiler Disabled';
			}
			
			var menu = document.createElement('menupopup'),
				enableDisable = document.createElement('menuitem'),
				fileWatcherItem = document.createElement('menuitem'),
				settingsItem = document.createElement('menuitem'),
				fileScopesEnable = document.createElement('menuitem'),
				fileScopes = document.createElement('menuitem');

			if (!compileEnabled) {
				enableDisable.setAttribute('label', 'Enable Compiler');
				enableDisable.setAttribute('oncommand', 'extensions.less.enableCompiler()');
			} else {
				enableDisable.setAttribute('label', 'Disable Compiler');
				enableDisable.setAttribute('oncommand', 'extensions.less.disableCompiler()');
			}

			if (prefs.getBoolPref('useFilewatcher')) {
				fileWatcherItem.setAttribute('label', 'Disable File Watcher');
				fileWatcherItem.setAttribute('oncommand', 'extensions.less.disableFileWatcher();');
			} else {
				fileWatcherItem.setAttribute('label', 'Enable File Watcher');
				fileWatcherItem.setAttribute('oncommand', 'extensions.less.enableFileWatcher();');
			}
			
			if (prefs.getBoolPref('useFileScopes')) {
				fileScopesEnable.setAttribute('label', 'Disable File Scopes');
				fileScopesEnable.setAttribute('oncommand', 'extensions.less.disableFileScopes();');
			} else {
				fileScopesEnable.setAttribute('label', 'Enable File Scopes');
				fileScopesEnable.setAttribute('oncommand', 'extensions.less.enableFilescopes();');
			}

			fileScopes.setAttribute('label', 'File Scopes'),
				fileScopes.setAttribute('oncommand', 'extensions.less.OpenLessFileScopes();');

			settingsItem.setAttribute('label', 'Settings'),
				settingsItem.setAttribute('oncommand', 'extensions.less.OpenLessSettings();');

			menu.appendChild(enableDisable);
			menu.appendChild(fileWatcherItem);
			menu.appendChild(fileScopesEnable);
			menu.appendChild(fileScopes);
			menu.appendChild(settingsItem);

			var panel = document.getElementById('statusbar-less'),
				button = document.createElement('toolbarbutton');

			button.setAttribute('class', 'statusbar-label');
			button.setAttribute('id', 'statusbar-less-label');
			button.setAttribute('flex', '1');
			button.setAttribute('orient', 'horizontal');
			button.setAttribute('type', 'menu');
			button.setAttribute('persist', 'buttonstyle');
			button.setAttribute('buttonstyle', 'text');
			button.setAttribute('label', label);
			
			if (panel.length === 0){
				self.addPanel();
				panel = document.getElementById('statusbar-less');
			}

			panel.appendChild(button);

			var button = document.getElementById('statusbar-less-label');
			button.appendChild(menu);

		} else {
			$("#statusbar-less").remove();
		}

	}

	this.varCompletion = function() {
		var editor_pane = ko.views.manager.topView;

		this._onKeyPress = function(e) {
			var scimoz = ko.views.manager.currentView.scimoz;
			if (e.shiftKey && e.charCode == 64) {
				var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
					file = d.file;

				if (!file) {
					self._notifcation('Please save the file first', true);
					return;
				}

				if (file.ext == '.less') {
					var currentLine = scimoz.lineFromPosition(scimoz.currentPos),
						currentLineStart = scimoz.lineLength(currentLine);

					try {
						if (currentLineStart > 3) {
							e.preventDefault();
							e.stopPropagation();
							self._autocomplete();
						} else {
							search = true;
						}
					} catch (e) {

					}
				}
			}
		}


		editor_pane.addEventListener('keypress', self._onKeyPress, true);
	}
	
	this._notifcation = function($message, error){
		$message =$message || false;
		error = error || false;
		var msgType = prefs.getCharPref('msgType');
		
		if (msgType === 'web-notifications') {
			var icon = error ? 'chrome://less/content/less-error-icon.png' : 'chrome://less/content/less-icon.png';
			if (!("Notification" in window)) {
			  alert("This browser does not support system notifications");
			}
		  
			else if (Notification.permission === "granted") {
			  var options = {
				body: $message,
				icon: icon
			  }
			  var n = new Notification('LESS Compiler', options);
			  setTimeout(n.close.bind(n), 5000); 
			}
		  
			else if (Notification.permission !== 'denied') {
			  Notification.requestPermission(function (permission) {
				if (permission === "granted") {
					var options = {
					   body: $message,
					   icon: icon
					 }
					 var n = new Notification('LESS Compiler', options);
					setTimeout(n.close.bind(n), 5000); 
				}
			  });
			}
		} else {
			notify.send(
					$message,
					'tools'
			);
		}
	}

	var features = "chrome,titlebar,toolbar,centerscreen";
	this.OpenLessSettings = function() {
		window.openDialog('chrome://less/content/pref-overlay.xul', "lessSettings", features);
	}

	this.OpenLessFileScopes = function() {
		var windowVars = {
			ko: ko,
			lessData: lessData,
			prefs: prefs,
			overlay: self,
			notify: notify,
		};
		window.openDialog('chrome://less/content/fileScopes.xul', "lessFileScopes", features, windowVars);
	}

	this._AfterSafeAction = function() {
		self._checkForSearch();
		self.compileFile(false, prefs.getBoolPref('compressFile'));
	}

	this._StartUpAction = function() {
		self._cleanUp();
		self.varCompletion();
	}

	this._focusAction = function() {
		self._updateStatusBar();
	}

	window.addEventListener("komodo-post-startup", self._StartUpAction, false);
	window.addEventListener("view_opened", self.getVars, false);
	window.addEventListener("focus", self._focusAction, false);
	window.addEventListener("file_saved", self._AfterSafeAction, false);
	window.addEventListener("current_view_changed", self._updateView, false);
}).apply(extensions.less);
