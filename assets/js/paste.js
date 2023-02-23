$(document).ready(function(e) {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);

	const raw = urlParams.get('raw');
	const url = urlParams.get('content');
	if (!url.startsWith("https://cdn.discordapp.com/attachments/")) {
		return;
	}

	let fixedheader = Cookies.get('fixedheader');
	if (fixedheader !== undefined) {
		if (fixedheader === 'true') {
			$(".pastewrapper").addClass("fixed");
			$("#fixedcb").prop('checked', true);
		}
	}

	$("#dlfile").attr('href', url);
	if (raw !== "true") {

		$("#viewrawfile").html("<p>View raw file</p>").attr('href', '/paste?content=' + url + '&raw=true');
		loadPasteData(url, false);
	}
	else {
		$("#viewrawfile").html("<p>View formatted file</p>").attr('href', '/paste?content=' + url + '&raw=false');
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

$(document).on('change', '#fixedcb', function() {
	let checked = $(this).is(":checked");
	if (checked) {
		$(".pastewrapper").addClass("fixed");
	}
	else {
		$(".pastewrapper").removeClass("fixed");
	}
	Cookies.set('fixedheader', checked, { expires: 365 });
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
				$("body").addClass("raw");
				$(".content").html('<div id="rawframe"><pre>' + content + '</pre></div>');
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
			$(".loadspinner").hide();

			let notfoundcontent = '<div class="notfound"><pre><p>File not available.</p><p>Paste files are kept for up to 7 days with your privacy in mind.</p></pre></div>';
			if (israw) {
				$("body").addClass("raw");
				$(".content").html('<div id="rawframe">' + notfoundcontent + '</div>');
			}
			else {
				$(".content").html(notfoundcontent);
			}
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