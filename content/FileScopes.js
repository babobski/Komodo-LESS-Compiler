(function() {
	var main = window.arguments[0],
		ko = main.ko,
		prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService).getBranch("extensions.less."),
		self = this,
		notify = main.notify,
		overlay = main.overlay;
		
	this.init = function(){
		var fileScopes = prefs.getCharPref('fileScopes'),
			parsedScopes = JSON.parse(fileScopes),
			tree = document.getElementById('fileScopes');
			
			if (parsedScopes.length > 0) {
				self.buildTree(tree, parsedScopes);
			}
	};
	
	this.buildTree = function(tree, items){
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
			var scope = items[e],
				newItem = document.createElement('listitem'),
				scopeName = document.createElement('listcell'),
				project = document.createElement('listcell'),
				outputFiles = document.createElement('listcell'),
				includeFolders = document.createElement('listcell');
				
				scopeName.setAttribute('label', scope.name);
				project.setAttribute('label', scope.project);
				outputFiles.setAttribute('label', scope.outputfiles.join(','));
				includeFolders.setAttribute('label', scope.includeFolders.join(','));
				
				newItem.appendChild(scopeName);
				newItem.appendChild(project);
				newItem.appendChild(outputFiles);
				newItem.appendChild(includeFolders);
				
				tree.appendChild(newItem);
		}
	}
	
	
	this.createNewScope = function(){
		overlay.openNewFileScope();
	}
	
	this.editFileScope = function(){
		var fileScopes = prefs.getCharPref('fileScopes'),
			parsedScopes = JSON.parse(fileScopes),
			tree = document.getElementById('fileScopes'),
			
			selectedItem = tree.getSelectedItem(0);
			
		if (parsedScopes.length === 0) {
			return false;
		}
			
		if (selectedItem !== null) {
			var scope = selectedItem.firstChild.attributes[0].value;
			
			for (var i = 0; i < parsedScopes.length; i++) {
				var scopeName = parsedScopes[i].name;
				
				if (scopeName === scope) {
					overlay.openNewFileScope(parsedScopes[i]);
				}
			}
		}
	}
	
	this.removeScope = function(){
		var fileScopes = prefs.getCharPref('fileScopes'),
			parsedScopes = JSON.parse(fileScopes),
			tree = document.getElementById('fileScopes'),
			output = [],
			selectedItem = tree.getSelectedItem(0);
			
		if (parsedScopes.length === 0) {
			return false;
		}
			
		if (selectedItem !== null) {
			var toRemove = selectedItem.firstChild.attributes[0].value;
			
			for (var i = 0; i < parsedScopes.length; i++) {
				var scopeName = parsedScopes[i].name;
				
				if (scopeName !== toRemove) {
					output.push(parsedScopes[i]);
				}
			}
			
			parsedOutput = JSON.stringify(output);
			prefs.setCharPref('fileScopes', parsedOutput);
			self.buildTree(tree, output);
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

}());



