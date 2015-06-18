// tools for common Komodo extension chores
xtk.load('chrome://less/content/toolkit.js');
// Komodo console in Output Window
xtk.load('chrome://less/content/konsole.js');
xtk.load('chrome://less/content/less.min.js');

/**
 * Namespaces
 */
if (typeof(extensions) === 'undefined') extensions = {};
if (typeof(extensions.less) === 'undefined') extensions.less = { version : '2.5.0' };

(function() {
	var self = this,
		prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("extensions.less.");

	this.compileFile = function(showWarning, compress, fileWatcher) {
		showWarning = showWarning || false;
		compress = compress || false;
		fileWatcher = fileWatcher || false;

		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			buffer = d.buffer,
			base = file.baseName,
			path = (file) ? file.URI : null;

		if (!file) {
			self._log('Please save the file first', konsole.S_ERROR);
			return;  
		}
		
		if (file.ext == '.less') {
			self._log('Compiling LESS file', konsole.S_LESS);
			
			if (fileWatcher !== false) {
				path = fileWatcher;
				base = path.substr(path.lastIndexOf('/') + 1, path.lenght),
				buffer = self._readFile(fileWatcher, '')[0];
			}
		
			outputLess = self._proces_less(path, base, buffer);
			
			less.render(outputLess, {compress: compress})
			.then(function(output) {
				var newFilename = path.replace('.less', '.css');

				self._saveFile(newFilename, output.css);
				self._log('File saved', konsole.S_OK) 
			},
			function(error) {
				self._log( error, konsole.S_ERROR);
			});
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
		
		outputLess = self._proces_less(path, base, buffer);
		
		less.render(outputLess, {compress: compress})
		.then(function(output) {
			d.buffer = output.css;
			self._log('Compiling LESS buffer', konsole.S_LESS);
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
			buffer = d.buffer,
			base = file.baseName,
			path = (file) ? file.URI : null;
		
			outputLess = self._proces_less(path, base, buffer);
		
			less.render(outputLess, {compress: compress})
			.then(function(output) {
				var css = output.css;
				scimoz.targetStart = scimoz.currentPos;
				scimoz.targetEnd = scimoz.anchor;
				scimoz.replaceTarget(css.length, css);
				self._log('Compiling LESS selection', konsole.S_LESS);
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

	this.compileSelection = function(compress) {
		compress = compress || false;

		var view = ko.views.manager.currentView,
			scimoz = view.scintilla.scimoz;
			text = scimoz.selText;
			
			less.render(text, { compress: compress })
			.then(function(output) {
				var css = output.css;
				scimoz.targetStart = scimoz.currentPos;
				scimoz.targetEnd = scimoz.anchor;
				scimoz.replaceTarget(css.length, css);
				self._log('Compiling LESS selection', konsole.S_NOTICE);
			},
			function(error) {
				self._log('Compile errror ' + error, konsole.S_ERROR);
			});
	};

	this.compileCompressSelection = function() {
		this.compileSelection(true);
	}
	
	this.watchFile = function(file) {
		this.compileFile(true, false, file);
	}
	 
	this._process_imports = function(imports, rootPath) {
		
		var buffer = '',
		newContent = '';
		
		if (imports !== -1) {
			imports.forEach(function(value, i){
				//if is regular @import
				if (value.match(/@import\s*['"][^"]+['"];/) !== null) {
					if (value.match(/['"](.*?)['"]/) !== null) {
						var xf = value.match(/['"](.*?)['"]/),
						fileName = xf.toString().split(',')[1].replace(/['"]+/g, '');
						if (fileName.match(/[a-z0-9][.][a-z]/i) == null) {
							fileName = fileName + '.less';
						}
						self._log('@import ' + fileName, konsole.S_CUSTOM);
						newContent = self._readFile(rootPath,  fileName);
						buffer = buffer + newContent[0];
						
						if (buffer.toString().match(/(@import\s*['"][^"]+['"];|@import\s+\W[^"]+\W\s+['"][^"]+["'];)/) !== null) {
							var cleanLess = buffer.toString().replace( /\/\/@import\s*['"][^";]+['"];|\/\/@import\s+\W[^"]+\W\s+['"][^";]+["'];/g, '' ), 
							newImport = cleanLess.split(/(@import\s*['"][^"]+['"];|@import\s+\W[^"]+\W\s+['"][^"]+["'];)/g);
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
							if (value.match(/['"](.*?)['"]/) !== null) {
								var xf = value.match(/['"](.*?)['"]/),
								fileName = xf.toString().split(',')[1].replace(/['"]+/g, '');
								if (fileName.match(/[a-z0-9][.][a-z]/i) == null) {
									fileName = fileName + '.less';
								}
								self._log('@import ' + fileName, konsole.S_CUSTOM);
								newContent = self._readFile(rootPath,  fileName);
								buffer = buffer + newContent[0];
								
								if (buffer.toString().match(/(@import\s*['"][^"]+['"];|@import\s+\W[^"]+\W\s+['"][^"]+["'];)/) !== null) {
									var cleanLess = buffer.toString().replace( /\/\/@import\s*['"][^";]+['"];|\/\/@import\s+\W[^"]+\W\s+['"][^";]+["'];/g, '' ), 
									newImport = cleanLess.split(/(@import\s*['"][^"]+['"];|@import\s+\W[^"]+\W\s+['"][^"]+["'];)/g);
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
							if (value.match(/['"](.*?)['"]/) !== null) {
								var xf = value.match(/['"](.*?)['"]/),
								fileName = xf.toString().split(',')[1].replace(/['"]+/g, '');
								if (fileName.match(/[a-z0-9][.][a-z]/i) == null) {
									fileName = fileName + '.less';
								}
								newContent = self._readFile(rootPath,  fileName);
								buffer = buffer + newContent[0];
								
								if (buffer.toString().match(/(@import\s*['"][^"]+['"];|@import\s+\W[^"]+\W\s+['"][^"]+["'];)/) !== null) {
									var cleanLess = buffer.toString().replace( /\/\/@import\s*['"][^";]+['"];|\/\/@import\s+\W[^"]+\W\s+['"][^";]+["'];/g, '' ), 
									newImport = cleanLess.split(/(@import\s*['"][^"]+['"];|@import\s+\W[^"]+\W\s+['"][^"]+["'];)/g);
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
		var cleanLess = content.toString().replace( /\/\/@import\s*['"][^";]+['"];|\/\/@import\s+\W[^"]+\W\s+['"][^";]+["'];/g, '' ), 
			newImports = cleanLess.split(/(@import\s*['"][^"';]+['"];|@import\s+\W[^"]+\W\s+['"][^''";]+["'];)/g);
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
			newRoot = '';
		
		//figure out ftp path if ../ in path
		if (filepath.search(/[.][.][/]+/) !== -1 ) {
			
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

}).apply(extensions.less);
