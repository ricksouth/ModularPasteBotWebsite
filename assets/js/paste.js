$(document).ready(function(e) {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);

	const raw = urlParams.get('raw');
	const url = urlParams.get('content');
	if (url == null || !url.startsWith("https://cdn.discordapp.com/attachments/")) {
		if (raw === "true") {
			displayFileNotFound(true);
			$("#viewrawfile p").html("View formatted file");
		}
		else {
			displayFileNotFound(false);
			$("#viewrawfile p").html("View raw file");
		}

		$("#viewrawfile").attr('href', '#');
		$("#dlfile").attr('href', '#');
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

			let celem = $(".pastewrapper .content");
			let count = (content.match(/\n/g) || '').length;
			for (let i = 0; i < Math.ceil(count/1000); i++) {
				celem.html(celem.html() + '<pre><code id="C' + i + '"></code></pre>');
			}

			let l = 1;
			let n = 0;
			let m = 0;
			let lines = "";
			for (let line of content.split("\n")) {
				if (lines !== "") {
					lines += "\n";
				}
				lines += line;

				if (n >= 999 || l === count) {
					const codeelem = $(".pastewrapper .content pre code")[m];
					$(codeelem).html(escapeHtml(lines));

					let extraprocessing = "";
					if (content.includes("Minecraft")) {
						$(codeelem).addClass("hljs");
						extraprocessing = "minecraft";
					}
					else {
						hljs.highlightElement(codeelem);
					}

					hljs.lineNumbersBlock(codeelem, {
						startFrom: l-n
					});

					const o = m;
					window['to' + o] = setTimeout( function() {
						doExtraProcessing(o, extraprocessing);

						$(".loadspinner").hide();
					}, 10);

					n  = 0;
					m += 1;
					l += 1;
					lines = "";
					continue;
				}

				l += 1;
				n += 1;
			}

			let fullurl = window.location.href;
			if (fullurl.includes("#")) {
				let linenumber = fullurl.substring(fullurl.lastIndexOf("#") + 1, fullurl.length);
				if (isNumeric(linenumber)) {
					let lineint = parseInt(linenumber);
					setTimeout( function() {
						let rows = $("table tr");

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
			}, 20);

		},
		error: function(data) {
			displayFileNotFound(israw);
		}
	});
}

function doExtraProcessing(count, identifier) {
	if (identifier === "minecraft") {
		$("code#C" + count + " table tr .hljs-ln-code").each(function (e) {
			let row = $(this);
			let rowhtml = row.html();

			let rowoutput = rowhtml;
			let trimmedrow = rowhtml.trim();
			if (trimmedrow.includes("]:")) {
				trimmedrow = trimmedrow.split("]:", 2)[1].trim();
			}

			let lineclass = "info";
			if (rowhtml.includes("Caused by: ") || rowhtml.includes("Exception: ") || rowhtml.includes("Error:")) {
				lineclass = "error"
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
				} else {
					line1 = line0;
				}

				let linesuffix = line1.split("(")[1].replace(")", "")
				if (linesuffix.includes(":")) {
					linesuffix = "<span class=\"at_line\">L" + linesuffix.split(":")[1] + "</span>"
				} else {
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
						} else {
							mainclass = "." + seg
						}
					} else {
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
			} else {
				let changed = false;
				let customoutput = "";
				for (let word of rowoutput.split(" ")) {
					if (customoutput !== "") {
						customoutput += " ";
					}

					if (word.endsWith(".jar")) {
						changed = true;
						customoutput += '<span class="jar">' + word + '</span>';
						continue;
					}

					let allgood = true;
					for (let ifs of [".txt", "json"]) {
						if (word.includes(ifs) && ! word.includes(ifs + ".")) {
							allgood = false;
							break;
						}
					}

					if (allgood) {
						if ((word.match(/\./g) || []).length >= 2) {
							let ppackage = ""
							let mainclass = ""
							let ffunction = ""
							let lsuffix = "";

							if (word.includes("(")) {
								let wspl = word.split("(");
								word = wspl[0];

								let linesuffix = wspl[1].replace(")", "")
								if (linesuffix.includes(":")) {
									lsuffix = "<span class=\"at_line\">:L" + linesuffix.split(":")[1] + "</span>"
								} else {
									lsuffix = "<span class=\"at_line\">:" + linesuffix.split(" ")[0].replaceAll(".", "").toLowerCase() + "</span>"
								}
							}

							for (let seg of word.split(".")) {
								if (seg.length === 0) {
									continue;
								}

								if (mainclass === "") {
									if (seg[0] === seg[0].toLowerCase()) {
										if (ppackage !== "") {
											ppackage += ".";
										}
										ppackage += seg;
									} else {
										mainclass = "." + seg
									}
								} else {
									ffunction = "." + seg
								}
							}

							if (mainclass.includes("$") && ffunction === "") {
								let mcspl = mainclass.split("$");
								mainclass = mcspl[0] + "$";
								ffunction = mcspl[1];
							}

							if (ppackage !== "" && mainclass !== "") {
								let newword = "<span class=\"at_package\">" + ppackage + "</span>" + "<span class=\"at_mainclass\">" + mainclass + "</span>" + "<span class=\"at_function\">" + ffunction + lsuffix + "</span>";
								customoutput += newword;
								changed = true;
								continue;
							}
						}
					}

					customoutput += word;
				}

				if (changed) {
					rowoutput = customoutput;
				}
			}

			if (lineclass === "info") {
				if (rowhtml.includes("/INFO")) {
					lineclass = "info"
				} else if (rowhtml.includes("/WARN")) {
					lineclass = "warning"
				} else if (rowhtml.includes("/ERROR") || rowhtml.includes("EXCEPTION") || rowhtml.includes(" crash ")) {
					lineclass = "error"
				}

				if (rowoutput.includes("]:")) {
					if (rowhtml.includes("STDERR")) {
						console.log(rowhtml);
					}

					const [first, ...rest] = rowoutput.split(']:')
					const second = rest.join(']:')
					rowoutput = first + ']:' + "</span><span>" + second;
				}
			}
			row.html('<span class="' + lineclass + '">' + rowoutput + '</span>');
		});
	}
	else {
		$(".content table tr .hljs-ln-code").each(function (e) {
			let row = $(this);
			let rowhtml = row.html();
			let newrowhtml = rowhtml;

			if (rowhtml.includes("Error") || rowhtml.includes("Exception")) {
				newrowhtml = '<span class="error">' + rowhtml + '</span>';
			}

			if (rowhtml !== newrowhtml) {
				row.html(newrowhtml);
			}
		});
	}
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
	let width = 87;
	let rightside = position.left + width + 5;

	if (rightside > $(window).width()) {
		label.html("FH");
	}
	else {
		label.html("Fixed Header");
	}
}

function displayFileNotFound(israw) {
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

function getUrlPrefix() {
	return atob("aHR0cHM6Ly9jZG4ubW9kdWxhcml0eS5nZy9wYXN0ZS8=");
}

function isNumeric(value) {
	return /^\d+$/.test(value);
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }