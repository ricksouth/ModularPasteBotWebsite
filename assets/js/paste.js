$(document).ready(function(e) {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);

	const url = urlParams.get('content');
	if (!url.startsWith("https://cdn.discordapp.com/attachments/")) {
		return;
	}

	const raw = urlParams.get('raw');

	if (raw !== "true") {
		$("#dlfile").html("<p>Download file</p>").attr('href', url);
		$("#viewrawfile").html("<p>View raw file</p>").attr('href', 'https://paste.modularity.gg/paste?content=' + url + '&raw=true');
		loadPasteData(url, false);
	}
	else {
		loadPasteData(url, true);
	}
});

$(document).on('mousedown', 'tr', function(e) {
	let number = $(this).children('.hljs-ln-line').attr('data-line-number');
	let fullurl = window.location.href;
	let url = fullurl.substring(0, fullurl.lastIndexOf("#"));

	$("tr.selected").removeClass("selected");
	$(this).addClass("selected");

	window.history.replaceState(null, document.title, url + "#" + number);
});

function loadPasteData(url, israw) {
	let urlsuffix = url.split('/attachments/')[1].replace(/\//, '_');
	$.ajax({
		url: getUrlPrefix() + urlsuffix,
		type: "GET",
		dataType: 'text',
		success: function(content) {
			try {
				let json = JSON.parse(content);
				if (json.hasOwnProperty('status')) {
					let status = json.status;
					if (status.hasOwnProperty('http_code')) {
						let http_code = status.http_code;
						if (http_code !== 200) {
							$(".download").html('<p class="notfound">File not found.</p>');
							return;
						}
					}
				}
			} catch (e) { }

			if (israw) {
				$("body").addClass("raw").html('<div class="download"><a href="' + url + '"><p>Download file</p></a><a href="' + window.location.href.replaceAll("&raw=true", "&raw=false") + '"><p>View formatted file</p></a></div><div id="rawframe">' + content + '</div>');
				return;
			}

			const celem = $(".pastewrapper code");
			celem.html(content);

			hljs.highlightAll();
			hljs.initLineNumbersOnLoad();

			let fullurl = window.location.href;
			if (fullurl.includes("#")) {
				let linenumber = fullurl.substring(fullurl.lastIndexOf("#") + 1, fullurl.length);
				if (isNumeric(linenumber)) {
					let lineint = parseInt(linenumber);
					setTimeout( function() {
						let rows = $("table tr");
						console.log(rows);

						if (rows.length >= lineint) {
							let selectedrow = $(rows[lineint-1]);
							selectedrow.addClass("selected");
							selectedrow.get(0).scrollIntoView({behavior: 'smooth'});
						}
					}, 10);
				}
			}

			setTimeout( function() {
				setMaxWidthLineNumbers();
				$(".loadspinner").hide();
			}, 10);
		},
		error: function(data) {
		}
	});
}

function setMaxWidthLineNumbers() {
	let length = $("table tr").length;
	let count = (length + "").length;
	let width = count * 7.2;

	$(".hljs-ln-numbers").attr('style', 'width: ' + width + 'px;')
}

function getUrlPrefix() {
	return atob("aHR0cHM6Ly9jZG4ubW9kdWxhcml0eS5nZy9wYXN0ZS8=");
}

function isNumeric(value) {
	return /^\d+$/.test(value);
}