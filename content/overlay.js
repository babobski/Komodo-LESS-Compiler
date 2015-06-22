// tools for common Komodo extension chores
xtk.load('chrome://less/content/toolkit.js');
// Komodo console in Output Window
xtk.load('chrome://less/content/konsole.js');
xtk.load('chrome://less/content/less/less.min.js');

/**
 * Namespaces
 */
if (typeof(extensions) === 'undefined') extensions = {};
if (typeof(extensions.less) === 'undefined') extensions.less = { version : '2.5.0' };

if (!('less' in ko)) ko.extensions = {}; 
var myExt = "lesscompiler@komodoeditide.com" ; 
if (!(myExt in ko.extensions)) ko.extensions[myExt] = {};
if (!('myapp' in ko.extensions[myExt])) ko.extensions[myExt].myapp = {};
var lessData = ko.extensions[myExt].myapp;

(function() {
	var self = this,
		prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.less.");
		
		

	this.compileFile = function(showWarning, compress, fileWatcher, getVars) {
		showWarning = showWarning || false;
		compress = compress || false;
		fileWatcher = fileWatcher || false;
		getVars = getVars || false;

		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			buffer = d.buffer,
			base = file.baseName,
			path = (file) ? file.URI : null,
			scimoz = ko.views.manager.currentView.scimoz;

		if (!file) {
			self._log('Please save the file first', konsole.S_ERROR);
			return;  
		}
		
		if (file.ext == '.less') {
			
			if (getVars) {
				self._log('Getting LESS vars', konsole.S_LESS);
			} else {
				self._log('Compiling LESS file', konsole.S_LESS);
			}
			
			if (fileWatcher !== false) {
				path = fileWatcher;
				base = path.substr(path.lastIndexOf('/') + 1, path.lenght),
				buffer = self._readFile(fileWatcher, '')[0];
			}
		
			outputLess = self._proces_less(path, base, buffer);
			if (getVars) {
				var allVars = self._getVars(outputLess);
				lessData.vars = allVars;
				if (lessData.vars !== undefined) {
					self._log(lessData.vars, konsole.S_OK);
				} else {
					lessData.vars = [ "@No_vars_found" ];
					self._log('No LESS vars found', konsole.S_ERROR);
					
				}
				
			} else {
				less.render(outputLess, {compress: compress})
				.then(function(output) {
					var newFilename = path.replace('.less', '.css');
	
					self._saveFile(newFilename, output.css);
					self._log('File saved', konsole.S_OK) 
				},
				function(error) {
					self._log( error, konsole.S_ERROR);
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
			base = file.baseName,
			path = (file) ? file.URI : null;
			
		self._log('Compile LESS buffer', konsole.S_LESS);
		
		outputLess = self._proces_less(path, base, buffer);
		
		less.render(outputLess, {compress: compress})
		.then(function(output) {
			d.buffer = output.css;
			self._log('Compiled LESS buffer', konsole.S_OK);
		},
		function(error) {
			self._log( error, konsole.S_ERROR);
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
			fileContent = d.buffer,
			base = file.baseName,
			path = (file) ? file.URI : null;
			
			self._log('Compiling LESS selection', konsole.S_LESS);
		
			outputLess = self._proces_less(path, base, fileContent);
		
			less.render(outputLess, {compress: compress})
			.then(function(output) {
				var css = output.css;
				scimoz.targetStart = scimoz.currentPos;
				scimoz.targetEnd = scimoz.anchor;
				scimoz.replaceTarget(css.length, css);
				self._log('Compiled LESS selection', konsole.S_OK);
			},
			function(error) {
				self._log( error, konsole.S_ERROR);
			});
	};

	this.compileCompressSelection = function() {
		this.compileSelection(true);
	}
	
	this.watchFile = function(file) {
		this.compileFile(true, false, file);
	}
	
	this.getVars = function(){
		this.compileFile(false, false, false, true);
	}
	
	this._process_imports = function(imports, rootPath) {
		
		var buffer = '',
		newContent = '',
		matchImports = /(@import\s*['"][^"]+['"];|@import\s+\W[^"]+\W\s+['"][^"]+["'];)/,
		matchValue = /['"](.*?)['"]/,
		nameHasDot = /[a-z0-9][.][a-z]/i,
		quotes = /['"]+/g;
		
		if (imports !== -1) {
			imports.forEach(function(value, i){
				//if is regular @import
				if (value.match(/@import\s*['"][^"]+['"];/) !== null) {
					if (value.match(matchValue) !== null) {
						var xf = value.match(matchValue),
						fileName = xf.toString().split(',')[1].replace(quotes, '');
						if (fileName.match(nameHasDot) == null) {
							fileName = fileName + '.less';
						}
						self._log('@import ' + fileName, konsole.S_CUSTOM);
						newContent = self._readFile(rootPath,  fileName);
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
								self._log('@import ' + fileName, konsole.S_CUSTOM);
								newContent = self._readFile(rootPath,  fileName);
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
						default:
							self._log('@import (' + type + ') is not supported, file is treated as LESS' , konsole.S_WARNING);
							if (value.match(matchValue) !== null) {
								var xf = value.match(matchValue),
								fileName = xf.toString().split(',')[1].replace(quotes, '');
								if (fileName.match(nameHasDot) == null) {
									fileName = fileName + '.less';
								}
								newContent = self._readFile(rootPath,  fileName);
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
	
	this._get_imports = function(content){
		var cleanLess = self._strip_comments(content), 
			newImports = self._split_on_imports(cleanLess);
			return newImports;
	}
	
	this._proces_less = function(path, base, buffer) {
		var rootPath = path.replace(base, ''),
			lessCss = String(buffer),
			LESS = '';
			
			less_imports = self._get_imports(lessCss);
			LESS = self._process_imports(less_imports, rootPath);
			
			return LESS;
	}
	
	this._strip_comments = function(string) {
		var patern = /\/\/@import\s+['"][^']+['"];|\/\/@import\s+\W[^"]+\W\s+['"][^";]+["'];/g;
		return string.toString().replace(patern , '' );
	}
	
	this._split_on_imports = function(cleanless){
		var patern = /(@import\s*['"][^"';]+['"];|@import\s+\W[^"]+\W\s+['"][^''";]+["'];)/g;
		return cleanless.split(patern);
	}

	this._saveFile = function(filepath, filecontent) {
		self._log('Saving file to ' + filepath, konsole.S_CUSTOM);

		var file = Components
			.classes["@activestate.com/koFileEx;1"]
			.createInstance(Components.interfaces.koIFileEx);
		file.path = filepath;

		file.open('w');

		file.puts(filecontent);
		file.close();

		return;
	};
	
	this._readFile = function (root, filepath, level = 0) {
		
		var fileUrl,
			fullUrl = root + filepath,
			newRoot = '',
			backPatern = /[.][.][/]+/;
		
		//figure out ftp path if ../ in path
		if (filepath.search(backPatern) !== -1 ) {
			
			var	url = fullUrl,
				urlParts = root.split('/'),
				backDirectories = url.match(/[[./]+/).length - 1,
				fileName = url.substr(url.lastIndexOf('/') + 1, url.lenght),
				$index =  parseFloat(root.match(/[/]+/g).length) - parseFloat(backDirectories),
				result = '';
				
				for (index = 0; index < $index; ++index) {
					result = result + urlParts[index] + '/';
				}
				
				fileUrl = result.toString() + fileName;
			
		} else {
			var fileName = '';
			
			fileUrl = fullUrl;
			fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1, fileUrl.length);
		}
		
		newRoot = fileUrl.replace(fileName, '');

		var reader = Components.classes["@activestate.com/koFileEx;1"]
                    .createInstance(Components.interfaces.koIFileEx),
					output = [];
		
		reader.path = fileUrl;
		
		try {
			reader.open("r");
			output[0] = reader.readfile();
			reader.close();
			output[1] = newRoot;
		} catch(e){
			self._log('ERROR Reading file: ' + fileUrl, konsole.S_ERROR);
		}
		
		return output;
	}

	this._log = function(message, style) {
		if (style == konsole.S_ERROR || prefs.getBoolPref('showMessages')) {
			konsole.popup();
			konsole.writeln('[LESS] ' + message, style);
		}
	};
	
	this._getVars = function(buffer){
		var bufferVars = '',
			allVars,
			output = [];
		
		if (buffer.match(/@[a-z0-9]+:/i)) {
			bufferVars = buffer.match(/@[a-z0-9]+:/gi);
			allVars = bufferVars.toString().split(',');
			
			allVars.forEach(function(value, i){
				output[i] = value.replace(/[:]+/g, '');	
			})
			
			return output;
		}
		
	}
	
	this.varCompletion = function(){
		var editor_pane = ko.views.manager.topView;
		var inserted = false;
		this._onKeyPress = function(e)
		{
			// Filter out CTRL+b
			// Ref: https://developer.mozilla.org/en-US/docs/DOM/KeyboardEvent
			// Ref: http://www.asquare.net/javascript/tests/KeyCode.html
			var scimoz = ko.views.manager.currentView.scimoz;
			var sep = String.fromCharCode(scimoz.autoCSeparator);
			var completions = lessData.vars;
			var defaultcompletion = ["@import", "@media", "@font-face", "@key-frame", "@-webkit-key-frames"];
			
			
			if (e.shiftKey && e.charCode == 64)		
			{
				var  d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
				file = d.file;
				
				if (!file) {
					self._log('Please save the file first', konsole.S_ERROR);
					return;  
				}
				
				if (file.ext == '.less') {
					var currentLine = scimoz.lineFromPosition(scimoz.currentPos),
					currentLineStart = scimoz.lineLength(currentLine);
					e.preventDefault();
					e.stopPropagation();
					
					defaultcompletion = defaultcompletion.sort();
					scimoz.replaceSel('');
					
					if (currentLineStart < 3) {
						scimoz.insertText(scimoz.currentPos, '@');
						scimoz.charRight();
						setTimeout(function(){
							scimoz.autoCShow(1, defaultcompletion.join(sep));
						}, 200);	
					} else {
						if (typeof completions !== 'undefined' && completions.length > 0) {
							completions = completions.sort();
						} else {
							self._log("No vars set, going find some!", konsole.S_WARNING);
							self.getVars();
							return false;
						}
						scimoz.insertText(scimoz.currentPos, '@');
						scimoz.charRight();
						setTimeout(function(){
							scimoz.autoCShow(1, completions.join(sep));
							inserted = true;
						}, 200);
					}
				}
			}
			
			//remove unwanted white space and ; 
			if (e.charCode == 59 && inserted == true) {
				var  d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
				file = d.file;
				
				if (file.ext == '.less') {
					this.removeWhiteSpace();
					inserted = false;
				}
			}
			
			this.removeWhiteSpace = function () {
				scimoz.charLeft();
				if (/\s/.test(scimoz.getWCharAt(scimoz.currentPos))) {
					scimoz.charRight();
					scimoz.deleteBackNotLine();
					scimoz.charLeft();
				} 
				
				if (/\s/.test(scimoz.getWCharAt(scimoz.currentPos))) {
					this.removeWhiteSpace();
				} else {
					scimoz.charRight();
					while (/[\t\s]/.test(scimoz.getWCharAt(scimoz.currentPos).toString())) {
						scimoz.charRight();
						scimoz.deleteBackNotLine();
					}
					if (/;/.test(scimoz.getWCharAt(scimoz.currentPos).toString())) {
						scimoz.charRight();
						scimoz.deleteBackNotLine();
					} 
				}
			}
			
		};
		editor_pane.addEventListener('keypress', self._onKeyPress, true);
	}

}).apply(extensions.less);
