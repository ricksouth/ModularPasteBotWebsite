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

	checkHeaderWidth();
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

$(window).on('resize', function(e) {
	checkHeaderWidth();
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
				$(".loadspinner").hide();
				return;
			}

			const celem = $(".pastewrapper code");
			celem.html(content);

			let extraprocessing = "";
			if (content.includes("Minecraft")) {
				$(".content pre code").addClass("hljs");
				extraprocessing = "minecraft";
			}
			else {
				hljs.highlightAll();
			}

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
				if (extraprocessing !== "") {
					doExtraProcessing(extraprocessing);
				}

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

function doExtraProcessing(identifier) {
	$(".content table tr .hljs-ln-code").each(function(e) {
		let row = $(this);
		let rowhtml = row.html();

		let rowoutput = rowhtml;
		let trimmedrow = rowhtml.trim();
		if (trimmedrow.includes("]:")) {
			trimmedrow = trimmedrow.split("]:")[1].trim();
		}

		let lineclass = "info";
		if (rowhtml.includes("Caused by: ") || rowhtml.includes("Exception: ") || rowhtml.includes("Error:")) {
			lineclass = "warning"
		}

		if (trimmedrow.startsWith("at ") && trimmedrow.includes("(")) {
			lineclass += " at"

			let lspl = rowhtml.split("at ", 2);
			let line0 = lspl[1];
			let line1;

			let wigglesplit = []
			if (line0.includes(" ~")) {
				wigglesplit = line0.split(" ~")

				line1 = wigglesplit[0];
			}
			else {
				line1 = line0;
			}

			let linesuffix = line1.split("(")[1].replace(")", "")
			if (linesuffix.includes(":")) {
				linesuffix = "<span class=\"at_line\">L" + linesuffix.split(":")[1] + "</span>"
			}
			else {
				linesuffix = "<span class=\"at_line\">" + linesuffix.split(" ")[0].replaceAll(".", "").toLowerCase() + "</span>"
			}

			let ppackage = ""
			let mainclass = ""
			let ffunction = ""

			let line2 = line1.split("(")[0];
			for (let seg of line2.split(".")) {
				if (mainclass === "") {
					if (seg[0] === seg[0].toLowerCase()) {
						if (ppackage !== "") {
							ppackage += ".";
						}
						ppackage += seg;
					}
					else {
						mainclass = "." + seg
					}
				}
				else {
					ffunction = "." + seg
				}
			}

			if (rowhtml.includes("com.natamus")) {
				lineclass += " com_natamus"
			}

			let middle = "<span class=\"at_package\">" + ppackage + "</span>" + "<span class=\"at_mainclass\">" + mainclass + "</span>" + "<span class=\"at_function\">" + ffunction + "</span>"

			let mixinsuffix = "";
			if (wigglesplit.length > 0) {
				let mixinstuff = wigglesplit[1]
				if (mixinstuff.includes(":mixin:APP:")) {
					mixinsuffix = " ~[";
					for (let mss of mixinstuff.split(":mixin:APP:")) {
						if (mss.includes("?:?")) {
							continue;
						}

						if (mixinsuffix !== " ~[") {
							mixinsuffix += ", ";
						}

						mixinsuffix += mss.split(",pl")[0];
					}
					mixinsuffix += "]";
				}
			}

			rowoutput = lspl[0] + "<span class=\"at_at\">at </span>" + middle + "<span class=\"at_line\">:</span>" + linesuffix + mixinsuffix
		}
		else {
			if (rowhtml.includes("/INFO")) {
				lineclass = "info"
			}
			else if (rowhtml.includes("/WARN")) {
				lineclass = "warning"
			}
			else if (rowhtml.includes("/ERROR") || rowhtml.includes("EXCEPTION") || rowhtml.includes(" crash ")) {
				lineclass = "error"
			}
		}

		if (rowoutput.includes("]:")) {
			let rhspl = rowoutput.split("]:", 2);
			rowoutput = rhspl[0] + "]:" + "</span><span>" + rhspl[1];
		}
		row.html('<span class="' + lineclass + '">' + rowoutput + '</span>');
	});
}

function setMaxWidthLineNumbers() {
	let length = $("table tr").length;
	let count = (length + "").length;
	let width = count * 7.2;

	$(".hljs-ln-numbers").attr('style', 'width: ' + width + 'px;')
}

function checkHeaderWidth() {
	let label = $(".fixeddiv label");
	let position = label.position();
	let width = 87; // label.width();
	console.log(width);
	let rightside = position.left + width + 5;

	if (rightside > $(window).width()) {
		label.html("FH");
	}
	else {
		label.html("Fixed Header");
	}
}

function getUrlPrefix() {
	return atob("aHR0cHM6Ly9jZG4ubW9kdWxhcml0eS5nZy9wYXN0ZS8=");
}

function isNumeric(value) {
	return /^\d+$/.test(value);
}