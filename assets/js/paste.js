$(document).ready(function(e) {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);

	const url = urlParams.get('content');
	const raw = urlParams.get('raw');
	let israw = raw === "true";

	if (url == null || !url.startsWith("https://cdn.discordapp.com/attachments/")) {
		if (israw) {
			displayFileNotFound(true);
			$("#viewrawfile img").attr('src', '/assets/images/header/formatted.svg');
		}
		else {
			displayFileNotFound(false);
			$("#viewrawfile img").attr('src', '/assets/images/header/raw.svg');
		}

		$("#viewrawfile").attr('href', '#');
		$("#dlfile").attr('href', '#');
		return;
	}

	$("#dlfile").attr('href', url);
	if (raw !== "true") {

		$("#viewrawfile").attr('href', '/paste?content=' + url + '&raw=true');
		$("#viewrawfile img").attr('src', '/assets/images/header/raw.svg');
		loadPasteData(url, false);
	}
	else {
		$("#viewrawfile").attr('href', '/paste?content=' + url + '&raw=false');
		$("#viewrawfile img").attr('src', '/assets/images/header/formatted.svg');
		loadPasteData(url, true);
	}

	if (/Mobi|Android/i.test(navigator.userAgent)) {
		$(".toggletooltipdiv").hide();
	}

	loadHeaderSettings(true, israw);
});

$(document).on('mousedown', 'tr', function(e) {
	let number = $(this).children('.hljs-ln-line').attr('data-line-number');
	let fullurl = window.location.href;
	let url = fullurl.substring(0, fullurl.lastIndexOf("#"));

	$("tr.selected").removeClass("selected");
	$(this).addClass("selected");

	window.history.replaceState(null, document.title, url + "#" + number);
});

$(document).on('mousedown', '#scrollimg,#nexterrorimg', function(e) {
	let scrollimg = $(this);
	let id = scrollimg.attr('id');
	let src = scrollimg.attr('src');
	if (src.includes("loading")) {
		return;
	}

	if (id === "scrollimg") {
		let rows = $(".content table tr");
		if (src.includes("_disabled")) {
			$("html, body").animate({scrollTop: 0}, "slow");
			src = src.replace("_disabled.svg", ".svg");
		} else {
			let lastrow = $(rows.get(rows.length - 1));
			$("html, body").animate({scrollTop: lastrow.position().top-getRowOffset()}, "slow");
			src = src.replace(".svg", "_disabled.svg");
		}

		scrollimg.attr('src', src);
	}
	else if (id === "nexterrorimg") {
		let selectedrow = $("tr.selected");

		let rows = $(".content table tr");
		if (selectedrow.length === 0) {
			$(rows.get(0)).addClass("selected");
		}

		let passedselected = false;
		rows.each(function(e) {
			let row = $(this);
			if (row.hasClass("selected")) {
				passedselected = true;
				return true;
			}

			if (passedselected) {
				let html = row.html();
				if (html.includes('<span class="error">')) {
					$("tr.selected").removeClass("selected");
					row.addClass("selected");
					$("html, body").animate({scrollTop: row.position().top-getRowOffset()}, "slow");
					return false;
				}
			}
		});
	}
});

const tooltipdescriptions = { "download" : "Download file", "raw" : "View raw file", "pinheader" : "Pin header to top of screen", "wraptext" : "Wrap text to fit screen", "darkmode" : "Toggle dark/light mode", "toggletooltip" : "Toggle header image tooltip visibility", "scroll" : "Scroll to bottom/top", "nexterror" : "Scroll to the next error line" };
$(".header img").on({
    mouseenter: function () {
		if (!$("body").hasClass("toggletooltip") || /Mobi|Android/i.test(navigator.userAgent)) {
			return;
		}

		let id = $(this).attr('id').replace("img", "");
		let description = tooltipdescriptions[id];

		if (id === "raw" && $("body").hasClass("raw")) {
			description = description.replace("raw", "formatted");
		}

		$(".tooltip p").html(description);
        $(".tooltip").show();
    },
    mouseleave: function () {
		if (!$("body").hasClass("toggletooltip")) {
			return;
		}

        $(".tooltip").hide();
    }
});

$(document).mousemove(function(e) {
	if (!$("body").hasClass("toggletooltip")) {
		return;
	}

	let x = e.pageX+10;
	let y = (e.pageY+10) - $(document).scrollTop();
	$(".tooltip").css('top', y + 'px').css('left', x + 'px');
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
				$(".scrolldiv").hide();
				$(".nexterrordiv").hide();
				$(".loadspinner").hide();
				return;
			}

			let extraprocessing = "";
			if (content.includes("Minecraft") || content.includes(".minecraft")) {
				extraprocessing = "minecraft";
			}
			else if (content.includes("sims4")) {
				extraprocessing = "sims";
			}

			let celem = $(".pastewrapper .content");
			let count = (content.match(/\n/g) || '').length;
			for (let i = 0; i < Math.ceil(count/1000); i++) {
				celem.html(celem.html() + '<pre><code id="C' + i + '"></code></pre>');
			}

			let wenttoline = false;
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

					if (extraprocessing !== "") {
						$(codeelem).addClass("hljs");
					}
					else {
						hljs.highlightElement(codeelem);
					}

					hljs.lineNumbersBlock(codeelem, {
						startFrom: l-n
					});

					const o = m;
					window['to' + o] = setTimeout( function() {
						window['top' + o] = setTimeout( function() {
							doExtraProcessing(o, extraprocessing);
							$(".loadspinner").hide();
						}, 10);

						if (o === m-1) {
							let maxwidth = 0;
							$(".pastewrapper pre table").each(function(e) {
								let width = $(this).width();
								if (width > maxwidth) {
									maxwidth = width;
								}
							});

							$('<style id="maxwidthstyle"> .maxwidth { width: ' + maxwidth + 'px !important; } </style>').appendTo("head");

							if ($("#wraptextimg").attr('src').includes("_disabled")) {
								$(".pastewrapper pre table").addClass("maxwidth");
							}
							else {
								$("body").addClass("wraptext");
							}

							if (wenttoline === false) {
								let fullurl = window.location.href;
								if (fullurl.includes("#")) {
									let linenumber = fullurl.substring(fullurl.lastIndexOf("#") + 1, fullurl.length);
									if (isNumeric(linenumber)) {
										let lineint = parseInt(linenumber);
										if (lineint < (o * 1000)) {
											wenttoline = true;

											let rows = $("table tr");

											if (rows.length >= lineint) {
												setTimeout( function() {
													let selectedrow = $(rows[lineint - 1]);
													selectedrow.addClass("selected");
													$("html, body").animate({scrollTop: selectedrow.position().top - getRowOffset()}, "slow");
												}, 10);
											}
										}
									}
								}
							}

							$("#scrollimg").attr('src', '/assets/images/header/scroll.svg');
						}
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

				let linesuffix = line1.split("(")[1].replace(")", "").split("[")[0]
				if (linesuffix.includes(":")) {
					linesuffix = "<span class=\"at_line\">L" + linesuffix.split(":")[1].trim() + "</span>"
				} else {
					linesuffix = "<span class=\"at_line\">" + linesuffix.split(" ")[0].replaceAll(".", "").toLowerCase().trim() + "</span>"
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
							let mixinsuffix = "";

							if (word.includes("(")) {
								let wspl = word.split("(");
								word = wspl[0];

								let linesuffix = wspl[1].replace(")", "")

								if (linesuffix.includes(" ~")) {
									let wigglesplit = linesuffix.split(" ~")
									linesuffix = wigglesplit[0];

									let mixinstuff = wigglesplit[1];
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

								linesuffix = linesuffix.split("[")[0];

								if (linesuffix.includes(":")) {
									lsuffix = "<span class=\"at_line\">:L" + linesuffix.split(":")[1].trim() + "</span>"
								} else {
									lsuffix = "<span class=\"at_line\">:" + linesuffix.split(" ")[0].replaceAll(".", "").toLowerCase().trim() + "</span>"
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

							if (ppackage !== "" && mainclass !== "" && !mainclass.includes("]:")) {
								let newword = "<span class=\"at_package\">" + ppackage + "</span>" + "<span class=\"at_mainclass\">" + mainclass + "</span>" + "<span class=\"at_function\">" + ffunction + lsuffix + mixinsuffix + "</span>";
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
				if (rowhtml.includes("/WARN") || rowhtml.includes("[Warning:")) {
					lineclass = "warning"
				} else if (rowhtml.includes("/ERROR") || rowhtml.includes("EXCEPTION") || rowhtml.includes(" crash ") || rowhtml.includes(" error ")) {
					lineclass = "error"
				}

				const rowends = ["]:", ")]"];
				for (let rowend of rowends) {
					if (rowoutput.includes(rowend)) {
						const [first, ...rest] = rowoutput.split(rowend)
						const second = rest.join(rowend)
						rowoutput = first + rowend + "</span><span>" + second;
						break;
					}
				}
			}
			row.html('<span class="' + lineclass + '">' + rowoutput + '</span>');
		});
	}
	else if (identifier === "sims") {
		$("code#C" + count + " table tr .hljs-ln-code").each(function (e) {
			let row = $(this);
			let rowhtml = row.html();
			let newrowhtml = rowhtml;

			let regextest = rowhtml.match(/\d+\.\d\d\.\d+\.\d+/);
			if (regextest != null) {
				let gameversion = regextest[0];
				rowhtml = rowhtml.replace(gameversion, '<span class="simsver">' + gameversion + '</span>');
			}

			if (rowhtml.includes("Error") || rowhtml.includes("Exception")) {
				newrowhtml = '<span class="error">' + rowhtml + '</span>';
			}

			if (rowhtml !== newrowhtml) {
				row.html(newrowhtml);
			}
		});
		// \d+\.\d\d\.\d+\.\d+
	}
	else {
		$("code#C" + count + " table tr .hljs-ln-code").each(function (e) {
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

/* Header Functions */
$(document).on('change', '.header input', function() {
	let inputelem = $(this);
	let id = inputelem.attr('id');
	if (id === "scroll" || id === "nexterror") {
		return;
	}

	let checked = inputelem.is(":checked");
	if (id === "toggletooltip" && !checked) {
		if ($(".tooltip").is(":visible")) {
			$(".tooltip").hide();
		}
	}

	let israw = $("body").hasClass("raw");
	let cookieprefix = "";
	if (israw) {
		cookieprefix = "raw_";
	}

	Cookies.set(cookieprefix + id, checked, { expires: 365, secure: true, sameSite: 'lax' });
	loadHeaderSettings(false, israw);
});

function loadHeaderSettings(initial, israw) {
	let cookieprefix = "";
	if (israw) {
		cookieprefix = "raw_";
	}

	$(".header input").each(function(e) {
		let inputelem = $(this);
		let id = inputelem.attr('id');
		if (id === "scroll" || id === "nexterror") {
			return true;
		}

		let imgname = inputelem.attr('value');
		let checked = Cookies.get(cookieprefix + id) !== 'false';

		let src = '/assets/images/header/' + imgname + '.svg';
		if (!checked) {
			src = src.replace(".svg", "_disabled.svg");
			$("body").removeClass(id);

			if (id === "wraptext" && !initial && !israw) {
				$(".pastewrapper pre table").addClass("maxwidth");
			}
		}
		else {
			if (!(id === "wraptext" && initial && !israw)) {
				$("body").addClass(id);
			}

			if (id === "wraptext" && !initial && !israw) {
				$(".pastewrapper pre table").removeClass("maxwidth");
			}
		}
		$("#" + id + "img").attr('src', src);

		inputelem.prop('checked', checked);

		if (!initial) {
			Cookies.set(cookieprefix + id, checked, {expires: 365, secure: true, sameSite: 'lax'});
		}
	});
}

/* Utility Functions */
function getUrlPrefix() {
	return atob("aHR0cHM6Ly9jZG4ubW9kdWxhcml0eS5nZy9wYXN0ZS8=");
}

function getRowOffset() {
	if ($("body").hasClass("pinheader")) {
		return 52;
	}
	return 0;
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