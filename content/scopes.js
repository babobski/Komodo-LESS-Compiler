(function(){
	var main = window.arguments[0],
		prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService).getBranch("extensions.less."),
		notify = main.notify,
		scope = main.scope,
		less = main.overlay,
		ko = main.ko,
		parse = ko.uriparse,
		self = this,
		newScope = {},
		helper = new Helper(),
		projectDir;
	
	this.init = function() {
		var currentProject = ko.projects.manager.currentProject,
			name = document.getElementById('scopeName');
		
		if (scope !== false) {
			name.value = scope.name;
			newScope.project = scope.project;
			newScope.outputfiles = scope.outputfiles;
			newScope.includeFolders = scope.includeFolders;
			projectDir = scope.projectDir;
			
			var outputFileTree = document.getElementById('outputFiles');
			var includeFoldersTree = document.getElementById('includeFolders');
			self.buildTree(outputFileTree, newScope.outputfiles);
			self.buildTree(includeFoldersTree, newScope.includeFolders);
			
		} else {
				if (currentProject === null) {
				notify.send(
					'No Current project selected',
					'Tools'
				);
				return false;
			}
			
			if (currentProject.importDirectoryLocalPath === null) {
				projectDir = parse.displayPath(currentProject.importDirectoryURI);
			} else {
				projectDir = parse.displayPath(currentProject.importDirectoryLocalPath);
			}
			
			newScope.project = currentProject.name.replace(/.komodoproject$/, '');
			newScope.projectDir = projectDir;
			newScope.outputfiles = [];
			newScope.includeFolders = [];
		}
	}
	
	this.setOutputFile = function() {
		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			dir = (file) ? file.displayPath.substr(0, (file.displayPath.length - file.baseName.length)) : null,
			path;
	
		try {
			if (helper.isRemote(dir)) {
				var remotePath = ko.filepicker.remoteFileBrowser(dir);
				window.focus();
				if (remotePath) {
					path = remotePath.file;
				}
			} else {
				var localPath = ko.filepicker.browseForFile(ko.uriparse.URIToPath(dir));
				window.focus();
				if (localPath) {
					path = localPath;
				}
			}
			
			if (path !== undefined && !helper.InArray(path, newScope.outputfiles)) {
				if (path.indexOf(projectDir) !== -1) {
					path = path.substr(projectDir.length, path.length);
					newScope.outputfiles.push(path);
					
					// build tree
					var outputFileTree = document.getElementById('outputFiles');
					self.buildTree(outputFileTree, newScope.outputfiles);
				} else {
					alert('File not in current project');
					helper.focusWin('newFileScope');
					return false;
				}
			}
		} catch (e) {
			console.log('Error: ' + e.message);
		}
	
	}
	
	this.selectIncludeFolder = function() {
		var d = ko.views.manager.currentView.document || ko.views.manager.currentView.koDoc,
			file = d.file,
			dir = (file) ? file.displayPath.substr(0, (file.displayPath.length - file.baseName.length)) : null,
			path;

		
		try {
			if (helper.isRemote(dir)) {
				var remotePath = document.createElement('input');
				ko.filepicker.browseForRemoteDir(remotePath);

				window.focus();
				var remoteDir = remotePath.value;
				if (remoteDir) {
					path = remoteDir;
				}
			} else {
				var localPath = document.createElement('input');
				ko.filepicker.browseForDir(localPath);
				window.focus();
				var localDir = localPath.value;
				if (localDir) {
					path = localDir;
				}
			}
			
			if (path !== undefined && !helper.InArray(path, newScope.includeFolders)) {
				if (path.indexOf(projectDir) !== -1) {
					path = path.substr(projectDir.length, path.length);
					newScope.includeFolders.push(path);
					
					// build tree
					var includeFoldersTree = document.getElementById('includeFolders');
					self.buildTree(includeFoldersTree, newScope.includeFolders);
				} else {
					alert('File not in current project');
					helper.focusWin('newFileScope');
					return false;
				}
			}
		} catch (e) {
			console.log('Error: ' + e.message);
		}

	}
	
	this.buildTree =function(tree, items) {
		tree = tree || false;
		items = items || false;
		
		if (!tree && !items) {
			return false;
		}
		
		if (tree.childElementCount > 0) {
			for (var i = tree.childElementCount; i > 0; i--) {
				var treeItem = tree.childNodes[(i - 1)];
				if (treeItem.nodeName !== 'listhead' && treeItem.nodeName !== 'listcols') {
					tree.removeChild(treeItem);
				} 
			}
		}
			
		for (var e = 0; e < items.length; e++) {
			var newItem = document.createElement('listitem'),
				treeCell = document.createElement('listcell');
				
				treeCell.setAttribute('label', items[e]);
				
				newItem.appendChild(treeCell);
				tree.appendChild(newItem);
		}
	}
	
	this.removeSelectedOutputFile = function() {
		var outputFileTree = document.getElementById('outputFiles'),
			selectedItem = outputFileTree.getSelectedItem(0),
			output = [];
			
		if (selectedItem !== null) {
			var toRemove = selectedItem.firstChild.attributes[0].value;
			
			for (var i = 0; i < newScope.outputfiles.length; i++) {
				var outputFile = newScope.outputfiles[i];
				
				if (outputFile !== toRemove) {
					output.push(outputFile);
				}
			}
			
			newScope.outputfiles = output;
			
			self.buildTree(outputFileTree, output);
		}
	}
	
	this.removeSelectedIncludeFolder = function() {
		var IncludeFolderTree = document.getElementById('includeFolders'),
			selectedItem = IncludeFolderTree.getSelectedItem(0),
			output = [];
			
		if (selectedItem !== null) {
			var toRemove = selectedItem.firstChild.attributes[0].value;
			
			for (var i = 0; i < newScope.includeFolders.length; i++) {
				var outputFile = newScope.includeFolders[i];
				
				if (outputFile !== toRemove) {
					output.push(outputFile);
				}
			}
			
			newScope.includeFolders = output;
			
			self.buildTree(IncludeFolderTree, output);
		}
	}
	
	this.saveFileScope = function(){
		var fileScopes = prefs.getCharPref('fileScopes');
		var parsedScopes = JSON.parse(fileScopes);
		var exists = false;
		
		if (helper.notEmpty(newScope)) {
			
			for (var i = 0; i < parsedScopes.length; i++) {
				var thisScope = parsedScopes[i];
				
				if (thisScope.name === newScope.name) {
					parsedScopes[i] = newScope;
					exists = true;
				}
			}
			
			if (!exists) {
				parsedScopes.push(newScope);
			}
			
			var parsedOutput = JSON.stringify(parsedScopes);
			prefs.setCharPref('fileScopes', parsedOutput);
		}
	}
	
	this.saveAndClose = function(){
		var name = document.getElementById('scopeName').value;
		
		if (name === '') {
			alert('Please fill in a name');
			window.focus();
			return false;
		}
		newScope.name = name;
		
		self.saveFileScope();
		less._focusFileScopes();
		setTimeout(function(){
			window.close();
		}, 300);
	}
	
	this.closeWindow = function(){
		helper.focusWin('lessFileScopes');
		window.close();
	}

}).apply();













