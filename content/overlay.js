// Komodo console in Output Window
xtk.load('chrome://less/content/less/less.min.js');

/**
 * Namespaces
 */
if (typeof(extensions) === 'undefined') extensions = {};
if (typeof(extensions.less) === 'undefined') extensions.less = { version : '1.3.1' };
(function() {
	var notify	= require("notify/notify"),
		self 	= this,
		prefs 	= Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.less.");
		
	if (!('less' in ko)) ko.extensions = {}; 
	var myExt = "lesscompiler@komodoeditide.com" ; 
	if (!(myExt in ko.extensions)) ko.extensions[myExt] = {};
	if (!('myapp' in ko.extensions[myExt])) ko.extensions[myExt].myapp = {};
	var lessData = ko.extensions[myExt].myapp;
	
	if (extensions.less && extensions.less.onKeyPress)
	{
		ko.views.manager.topView.removeEventListener(
			'keypress',
			extensions.less._onKeyPress, true
		);
		
		window.removeEventListener("komodo-post-startup", self._cleanUp, false);
	}
	
	
		
	this.compileFile = function(showWarning, compress, getVars) {
		showWarning = showWarning || false;
		compress = compress || false;
		getVars = getVars || false;

		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			buffer = d.buffer,
			base = (file) ? file.baseName : null,
			path = (file) ? file.URI : null;

		if (!file || !path) {
			if (! getVars) {
				notify.send(
					'LESS: Please save the file first',
					'tools'
				);	
			}
			return;  
		}
		
		if (file.ext == '.less') {
			if (getVars) {
				notify.send(
					'LESS: Getting LESS vars',
					'tools'
				);	
			} 
			
			if (prefs.getBoolPref('useFilewatcher')) {
				path = prefs.getCharPref('fileWatcher');
				base = path.substr(path.lastIndexOf('/') + 1, path.lenght),
				buffer = self._readFile(path, '')[0];
			}
		
			outputLess = self._proces_less(path, base, buffer);
			if (getVars) {
				var allVars = self._getVars(outputLess);
				lessData.vars = allVars;
				if (lessData.vars !== undefined) {
				} else {
					lessData.vars = [ "@No_vars_found" ];
					notify.send(
						'LESS: No LESS vars found',
						'tools'
					);	
				}
				
			} else {
				less.render(outputLess, {compress: compress})
				.then(function(output) {
					var newFilename = path.replace('.less', '.css');
	
					self._saveFile(newFilename, output.css);
					notify.send(
						'LESS: File saved',
						'tools'
					);	
				},
				function(error) {
					notify.send(
						'LESS ERROR: ' + error,
						'tools'
					);	
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
			notify.send(
				'LESS: Please save the file first',
				'tools'
			);	
			return;  
		}
		
		outputLess = self._proces_less(path, base, buffer);
		
		less.render(outputLess, {compress: compress})
		.then(function(output) {
			d.buffer = output.css;
			notify.send(
				'LESS: Compiled LESS buffer',
				'tools'
			);	
		},
		function(error) {
			notify.send(
				'LESS ERROR: ' + error,
				'tools'
			);
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
				notify.send(
					'LESS: Please save the file first',
					'tools'
				);	
				return;  
			}
		
			outputLess = self._proces_less(path, base, text);
		
			less.render(outputLess, {compress: compress})
			.then(function(output) {
				var css = output.css;
				scimoz.replaceSel(css);
				notify.send(
				'LESS: Compiled LESS selection',
					'tools'
				);
			},
			function(error) {
				notify.send(
					'LESS ERROR: ' + error,
					'tools'
				);
			});
	};

	this.compileCompressSelection = function() {
		this.compileSelection(true);
	}
	
	this.getVars = function(){
		this.compileFile(false, false, true);
	}
	
	this.enableFileWatcher = function(){
		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			path = (file) ? file.URI : null;
			

		if (!file) {
			notify.send(
			'LESS: Please save the file first',
				'tools'
			);
			return;  
		}
		
		if (file.ext == '.less') {
			if (prefs.getBoolPref('useFilewatcher') == false) {
				prefs.setBoolPref('useFilewatcher', true);
			}
			
			prefs.setCharPref('fileWatcher', path);
			notify.send(
			'LESS: file watcher enabled',
				'tools'
			);
		} else {
			notify.send(
			'LESS: Please select a LESS file',
				'tools'
			);
			return;  
		}
	}
	
	this.disableFileWatcher = function(){
		if (prefs.getBoolPref('useFilewatcher')) {
			prefs.setBoolPref('useFilewatcher', false);
		}
		
		prefs.setCharPref('fileWatcher', '');
		notify.send(
		'LESS: file watcher disabled',
			'tools'
		);
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
							notify.send(
							'@import (' + type + ') is not supported, file is treated as LESS',
								'tools'
							);
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
			notify.send(
				'LESS ERROR: Reading file: ' + fileUrl,
				'tools'
			);
		}
		
		return output;
	}
	
	this._getVars = function(buffer){
		var bufferVars = '',
			allVars,
			output = [];
		
		if (buffer.match(/@[a-z0-9]+:/i)) {
			bufferVars = buffer.match(/@[a-z0-9]+:/gi);
			allVars = bufferVars.toString().split(',');
			
			allVars.forEach(function(value, i){
				var val = value.replace(/[:,]+/g, '');
				if (!self._in_array(val, output)) {
					output.push(val);	
				}
			})
			
			return output;
		}
		
	}
	
	this._in_array = function (search, array) {
		for (i = 0; i < array.length; i++) {
			if(array[i] ==search ) {
				return true;
			}
		}
		return false;
	}
	
	this._cleanUp = function() {
		if (prefs.getBoolPref('useFilewatcher')) {
			var features = "chrome,titlebar,toolbar,centerscreen,modal";
			window.openDialog('chrome://less/content/fileWatcher.xul', "removeFileWatcher", features, self);
		}
	}
	
	this.varCompletion = function(){
		var editor_pane = ko.views.manager.topView;
		var inserted = false;
		
		this._onKeyPress = function(e)
		{
			var scimoz = ko.views.manager.currentView.scimoz;
			var sep = String.fromCharCode(scimoz.autoCSeparator);
			var completions = lessData.vars;
			var defaultcompletion = ["@import", "@media", "@font-face", "@page", "@charset", "@namespace", "@keyframes", "@-webkit-keyframes"];
			
			if (scimoz.autoCMaxHeight !== 10) {
				scimoz.autoCMaxHeight = 10;
			}
			
			if (e.shiftKey && e.charCode == 64)		
			{
				var  d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
				file = d.file;
				
				if (!file) {
					notify.send(
					'Please save the file first',
						'tools'
					);
					return;  
				}
				
				if (file.ext == '.less') {
					var currentLine = scimoz.lineFromPosition(scimoz.currentPos),
					currentLineStart = scimoz.lineLength(currentLine);
					e.preventDefault();
					e.stopPropagation();
					
					defaultcompletion = defaultcompletion.sort();
					scimoz.beginUndoAction()
					try {
						scimoz.replaceSel('');
						
						if (currentLineStart < 3) {
							scimoz.insertText(scimoz.currentPos, '@');
							scimoz.charRight();
							setTimeout(function(){
								scimoz.autoCShow(1, defaultcompletion.join(sep));
							}, 100);	
						} else {
							if (typeof completions !== 'undefined' && completions.length > 0) {
								completions = completions.sort();
							} else {
								notify.send(
								'No vars set, going find some!',
									'tools'
								);
								self.getVars();
								return false;
							}
							scimoz.insertText(scimoz.currentPos, '@');
							scimoz.charRight();
							setTimeout(function(){
								scimoz.autoCShow(1, completions.join(sep));
								inserted = true;
							}, 100);
						}
					} finally {
						scimoz.endUndoAction()
					}
				}
			}
			
			//remove unwanted white space and ; 
			if (e.charCode == 59 && inserted == true) {
				var  d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
				file = d.file;
				
				if (file.ext == '.less') {
					inserted = false;
					this.removeWhiteSpace();
				}
			}
		
			//trigger on )
			if (e.charCode == 41 && inserted == true) {
				var  d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
				file = d.file;
				
				if (file.ext == '.less') {
					inserted = false;
					this.removeWhiteSpace();
				}
			}
			
			//trigger on ,
			if (e.charCode == 44 && inserted == true) {
				var  d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
				file = d.file;
				
				if (file.ext == '.less') {
					inserted = false;
					this.removeWhiteSpace();
				}
			}
			
			//trigger on :
			if (e.shiftKey && e.charCode == 58 || e.shiftKey && e.charCode == 59 ) {
				var  d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
				file = d.file,
				buffer = d.buffer;
				
				if (file.ext == '.less') {
						var testString = buffer.substring((scimoz.currentPos - 14), scimoz.currentPos);
						if (/@[a-z0-9-_]+$/i.test(testString)) {
							e.preventDefault();
							e.stopPropagation();
							scimoz.insertText(scimoz.currentPos, ':');
							scimoz.charRight();
							scimoz.autoCCancel();	
						}
				}
			}
			
			this.removeWhiteSpace = function () {
				
				scimoz.beginUndoAction()
				try {
					var current_line = scimoz.lineFromPosition(scimoz.currentPos);
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
						while (/[\t\s]/.test(scimoz.getWCharAt(scimoz.currentPos).toString()) && current_line == scimoz.lineFromPosition(scimoz.currentPos)) {
							scimoz.charRight();
							scimoz.deleteBackNotLine();
						}
						
						currentChar = scimoz.getWCharAt(scimoz.currentPos).toString();
						switch (currentChar) {
							case ';':
								scimoz.charRight();
								scimoz.deleteBackNotLine();
								break;
							case ')':
								scimoz.charRight();
								scimoz.deleteBackNotLine();
								break;
							case ',':
								scimoz.charRight();
								scimoz.deleteBackNotLine();
								break;
							default:
								scimoz.charLeft();
								break;
						}
					}
				} finally {
					scimoz.endUndoAction()
				}
				
			}
		};
		editor_pane.addEventListener('keypress', self._onKeyPress, true);
	}
	 
	window.addEventListener("komodo-post-startup", self._cleanUp, false);
}).apply(extensions.less);
