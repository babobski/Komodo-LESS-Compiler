(function() {
	this.Helper = function() {
		
		this.notEmpty = function(obj){
			for(var prop in obj) {
				 if(obj.hasOwnProperty(prop))
					 return true;
			 }
		 
			 return JSON.stringify(obj) !== JSON.stringify({});
		 }
		 
		 this.isRemote = function(url) {
			 if (/^ftp(s|):\/\//i.test(url)) {
				 return true;
			 } else if (/^sftp:\/\//i.test(url)) {
				 return true;
			 } else if (/[a-z0-9\-_]+@/i.test(url)) {
				 return true;
			 }
	 
			 return false;
		 }
	 
		 this.InArray = function(search, array) {
			 for (var i = 0; i < array.length; i++) {
				 if (array[i] == search) {
					 return true;
				 }
			 }
			 return false;
		 }
		 
		 this.focusWin = function(windowName) {
		var wenum = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
			.getService(Components.interfaces.nsIWindowWatcher)
			.getWindowEnumerator();
		var index = 1;
		
		while (wenum.hasMoreElements()) {
			var win = wenum.getNext();
			console.log(win.name);
			if (win.name == windowName) {
				win.focus();
				return;
			}
			index++
		}
	}
		
	}
}());

