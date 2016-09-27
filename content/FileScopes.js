if (typeof(extensions) === 'undefined') extensions = {};
if (typeof(extensions.less) === 'undefined') extensions.less = {
	version: '2.1.4'
};

(function() {
	var self = window.arguments[0],
		ko = self.ko,
		pref = self.prefs,
		scope = this,
		notify = self.notify,
		overlay = self.overlay;


	if (!('extensions' in ko)) ko.extensions = {};
	var myExt = "lesscompiler@komodoeditide.com";
	if (!(myExt in ko.extensions)) ko.extensions[myExt] = {};
	if (!('myapp' in ko.extensions[myExt])) ko.extensions[myExt].myapp = {};
	var lessData = ko.extensions[myExt].myapp;

	this._selectOutputFile = function(node) {
		var input = node.previousSibling;
		var id = input['id'];
		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			buffer = d.buffer,
			base = (file) ? file.baseName : null,
			path = (file) ? file.URI : null
			outputfile01 = pref.getCharPref('outputfile01'),
			outputfile02 = pref.getCharPref('outputfile02'),
			outputfile03 = pref.getCharPref('outputfile03'),
			outputFiles = [];


		if (!file) {
			scope._AlertMessage('No current file selected');
			return false;
		}

		if (outputfile01 !== null) {
			outputFiles.push(outputfile01);
		}

		if (outputfile02 !== null) {
			outputFiles.push(outputfile02);
		}

		if (outputfile03 !== null) {
			outputFiles.push(outputfile03);
		}

		try {
			var parsedPath = ko.uriparse.displayPath(path);
			var dir = parsedPath.substr(0, scope._last_slash(parsedPath) + 1);
			var oldValue = input.value;

			if (scope.isRemote(dir)) {
				var path = ko.filepicker.remoteFileBrowser(dir);
				window.focus();
				if (path) {
					path = path.file;
					if (outputFiles.length > 0 && scope._in_array(path, outputFiles)) {
						scope._AlertMessage('Output file already selected.');
						if (oldValue.length > 0) {
							input.value = oldValue;
						} else {
							input.value = '';
						}
						return false;
					}
					input.value = path;
					pref.setCharPref(id, path);
					window.focus();
				}
			} else {
				var path = ko.filepicker.browseForFile(ko.uriparse.URIToPath(dir));
				window.focus();
				if (path) {
					if (outputFiles.length > 0 && scope._in_array(path, outputFiles)) {
						scope._AlertMessage('Output file already selected.');
						if (oldValue.length > 0) {
							input.value = oldValue;
						} else {
							input.value = '';
						}
						return false;
					}
					input.value = path;
					pref.setCharPref(id, path);
					window.focus();
				}
			}
		} catch (e) {
			scope._AlertMessage('Error: ' + e.message);
		}

	}

	this._AlertMessage = function(message) {
		var error_block = document.getElementById('error_block');

		if (typeof removeAlert !== undefined) {
			clearTimeout(removeAlert);
		}

		error_block.innerHTML = message;
		error_block.style.opacity = 0;
		error_block.style.display = "block";

		(function fade() {
			var val = parseFloat(error_block.style.opacity);
			if (!((val += .1) > 1)) {
				error_block.style.opacity = val;
				requestAnimationFrame(fade);
			}
		})();

		var removeAlert = setTimeout(function() {
			error_block.innerHTML = '';
		}, 3000);

	}

	this._clearScope = function(node) {
		var wrap = node.parentNode;
		var textboxes = wrap.parentNode.getElementsByTagName('textbox');

		if (textboxes.length > 0) {
			for (i = 0; i < textboxes.length; i++) {
				textboxes[i].value = '';
				pref.setCharPref(textboxes[i].id, '');
			}
		}
	}

	this._selectIncludeFolder = function(node) {
		var input = node.previousSibling;
		var id = input['id'];
		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			buffer = d.buffer,
			base = (file) ? file.baseName : null,
			path = (file) ? file.URI : null,
			includeLess01Folder01 = pref.getCharPref('includeLess01Folder01').length > 0 ? pref.getCharPref('includeLess01Folder01') : null,
			includeLess01Folder02 = pref.getCharPref('includeLess01Folder02').length > 0 ? pref.getCharPref('includeLess01Folder02') : null,
			includeLess01Folder03 = pref.getCharPref('includeLess01Folder03').length > 0 ? pref.getCharPref('includeLess01Folder03') : null,
			includeLess02Folder01 = pref.getCharPref('includeLess02Folder01').length > 0 ? pref.getCharPref('includeLess02Folder01') : null,
			includeLess02Folder02 = pref.getCharPref('includeLess02Folder02').length > 0 ? pref.getCharPref('includeLess02Folder02') : null,
			includeLess02Folder03 = pref.getCharPref('includeLess02Folder03').length > 0 ? pref.getCharPref('includeLess02Folder03') : null,
			includeLess03Folder01 = pref.getCharPref('includeLess03Folder01').length > 0 ? pref.getCharPref('includeLess03Folder01') : null,
			includeLess03Folder02 = pref.getCharPref('includeLess03Folder02').length > 0 ? pref.getCharPref('includeLess03Folder02') : null,
			includeLess03Folder03 = pref.getCharPref('includeLess03Folder03').length > 0 ? pref.getCharPref('includeLess03Folder03') : null,
			includeFiles = [];

		if (!file) {
			scope._AlertMessage('No current file selected');
			return false;
		}

		if (includeLess01Folder01 !== null) {
			includeFiles.push(includeLess01Folder01);
		}

		if (includeLess01Folder02 !== null) {
			includeFiles.push(includeLess01Folder02);
		}

		if (includeLess01Folder03 !== null) {
			includeFiles.push(includeLess01Folder03);
		}

		if (includeLess02Folder01 !== null) {
			includeFiles.push(includeLess02Folder01);
		}

		if (includeLess02Folder02 !== null) {
			includeFiles.push(includeLess02Folder02);
		}

		if (includeLess02Folder03 !== null) {
			includeFiles.push(includeLess02Folder03);
		}

		if (includeLess03Folder01 !== null) {
			includeFiles.push(includeLess03Folder01);
		}

		if (includeLess03Folder02 !== null) {
			includeFiles.push(includeLess03Folder02);
		}

		if (includeLess03Folder03 !== null) {
			includeFiles.push(includeLess03Folder03);
		}

		try {
			var parsedPath = ko.uriparse.displayPath(path);
			var dir = parsedPath.substr(0, scope._last_slash(parsedPath) + 1);
			var oldValue = input.value;

			if (scope.isRemote(dir)) {
				ko.filepicker.browseForRemoteDir(input);

				window.focus();
				var path = input.value;
				if (path) {
					if (includeFiles.length > 0 && scope._in_array(path, includeFiles)) {
						scope._AlertMessage('Include folder already selected.');
						if (oldValue.length > 0) {
							input.value = oldValue;
						} else {
							input.value = '';
						}
						return false;
					}
					pref.setCharPref(id, path);

				}
			} else {
				ko.filepicker.browseForDir(input);

				window.focus();
				var path = input.value;
				if (path) {
					if (includeFiles.length > 0 && scope._in_array(path, includeFiles)) {
						scope._AlertMessage('Include folder already selected.');
						if (oldValue.length > 0) {
							input.value = oldValue;
						} else {
							input.value = '';
						}
						return false;
					}
					pref.setCharPref(id, path);

				}
			}
		} catch (e) {
			scope._AlertMessage('Error: ' + e.message);
		}

	}

	this.focus = function() {
		var wenum = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
			.getService(Components.interfaces.nsIWindowWatcher)
			.getWindowEnumerator();
		var index = 1;
		var windowName = "less-filescope-prefs";
		while (wenum.hasMoreElements()) {
			var win = wenum.getNext();
			if (win.name == windowName) {
				win.focus();
				return;
			}
			index++
		}
	}


	this.isRemote = function(url) {
		if (/^ftp:\/\//i.test(url)) {
			return true;
		} else if (/^sftp:\/\//i.test(url)) {
			return true;
		} else if (/[a-z0-9\-_]+@/i.test(url)) {
			return true;
		}

		return false;
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

}).apply(extensions.less);
