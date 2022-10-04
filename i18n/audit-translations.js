"use strict";

const deepl = require("deepl-node");
const fs = require("fs");
const PO = require("pofile");
const GoogleTranslate = require("@google-cloud/translate").v3.TranslationServiceClient;

let keys = fs.existsSync("./keys.json") ? JSON.parse(fs.readFileSync("./keys.json")) : null;

const deepl_translator = keys ? new deepl.Translator(keys.deepl_api_key) : null;
const googleTranslate = keys
    ? new GoogleTranslate({
          projectId: keys.google_credentials.project_id,
          credentials: keys.google_credentials,
      })
    : null;

let limit = 1;

async function main() {
    //const countries = JSON.parse(await fs.promises.readFile("./build/countries.json", "utf-8"));
    //const ui_keys = JSON.parse(await fs.promises.readFile("./build/ogs-ui-keys.json", "utf-8"));
    if (!fs.existsSync("./autotranslations.json")) {
        await fs.promises.writeFile("./autotranslations.json", "{}");
    }

    const autotranslations = JSON.parse(
        await fs.promises.readFile("./autotranslations.json", "utf-8"),
    );
    const languages = JSON.parse(await fs.promises.readFile("./languages.json", "utf-8"));
    let translations_missing = {};
    let vandalized_languages = {};
    let autotranslations_needed = {};

    for (let lang in languages) {
        let conv = lang.replace(/([a-z]+)-([a-zA-Z]+)/, (_, a, b) => `${a}_${b.toUpperCase()}`);
        const po = await asyncLoadPoFile(`./locale/${conv}.po`);

        let missing = 0;
        let missing_strings = [];
        let errors = 0;
        let vandalizations = 0;
        for (let item of po.items) {
            if (item.obsolete) {
                continue;
            }

            for (let str of [item.msgid, item.msgid_plural]) {
                if (!str) {
                    continue;
                }

                let label_replacements = str.match(/([{][{][a-zA-Z_]+[}][}])/g);
                let num_percent_s = str.match(/%[sd]/g) ? str.match(/%[sd]/g).length : 0;

                for (let msg of item.msgstr) {
                    let auto_translated = "";
                    if (msg.trim() === "") {
                        missing++;
                        missing_strings.push(str);
                        if (!(lang in autotranslations_needed)) {
                            autotranslations_needed[lang] = {};
                        }
                        autotranslations_needed[lang][str] = str;

                        if (!(lang in autotranslations) || !(str in autotranslations[lang])) {
                            continue;
                        } else {
                            msg = autotranslations[lang][str];
                            auto_translated = "[autotranslated] ";
                            //console.log("Using autotranslation", str, " -> ", msg);
                        }
                    }

                    if (looks_vandalized(lang, msg)) {
                        console.log(
                            `${auto_translated}${conv}.po: vandalization: ${str} -> ${msg}`,
                        );
                        vandalized_languages[lang] = ++vandalizations;
                    }

                    let m = msg.match(/%[sd]/g);
                    if (num_percent_s != (m ? m.length : 0)) {
                        console.log(`${auto_translated}${conv}.po: %s mismatch: ${str} -> ${msg}`);
                        errors++;
                    }

                    if (label_replacements) {
                        for (let replacement of label_replacements) {
                            if (replacement === "{{num}}" && msg.indexOf("{{") < 0) {
                                // {{num}} point often goes to "1" in the case where num == 1, this is a fine translation
                                // so allow this, but if we see any {{ in the string then it's probably likely that the
                                // translator actually translated "num", which is a problem.
                                continue;
                            }
                            if (msg.indexOf(replacement) < 0) {
                                console.log(
                                    `${auto_translated}${conv}.po: label replacement for ${replacement} missing: ${str} -> ${msg}`,
                                );
                                errors++;
                            }
                        }
                    }
                }
            }
        }

        if (vandalizations > 0) {
            console.log(`*** VANDALIZED *** ${vandalizations} vandalizations`);
        } else if (errors > 0) {
            console.log(`** BAD ** ${lang}: ${missing} missing ${errors} errors`);
            //exit_code = 1;
        } else if (missing > 0) {
            console.log(`MISSING ${lang}: ${missing} missing`);
            /*
            if (missing < 10) {
                for (let str of missing_strings) {
                    console.log(`    ${str}`);
                }
            }
            */
        } else {
            console.log(`GOOD ${lang}`);
        }

        translations_missing[lang] = missing;

        if (vandalizations === 0) {
            let data = await fs.promises.readFile(`./locale/${lang}.js`, "utf8");
            if (/window.ogs_missing_translation_count = [0-9]+;/.test(data)) {
                //console.log("Replace missing")
                data = data.replace(
                    /window.ogs_missing_translation_count = [0-9]+;/,
                    `window.ogs_missing_translation_count = ${missing};`,
                );
            } else {
                //console.log("Add missing")
                data += `window.ogs_missing_translation_count = ${missing};`;
            }
            await fs.promises.writeFile(`./locale/${lang}.js`, data);
        }
    }

    await fs.promises.writeFile("./locale/translations_missing.json", JSON.stringify(translations_missing, null, 4));

    if (deepl_translator && googleTranslate) {
        if (Object.keys(vandalized_languages).length > 0) {
            console.error(
                `Critical error: ${
                    Object.keys(vandalized_languages).length
                } languages have been vandalized`,
            );
            console.error(JSON.stringify(vandalized_languages, undefined, 4));
            process.exit(1);
        }

        let num_placeholders = 0;
        const placeholder_a_to_n = { "%s": "8888888", "%d": "9999999" };
        const placeholder_n_to_a = { 8888888: "%s", 9999999: "%d" };

        for (let lang in autotranslations_needed) {
            for (let str in autotranslations_needed[lang]) {
                if (lang in autotranslations && str in autotranslations[lang]) {
                    delete autotranslations_needed[lang][str];
                } else {
                    let label_replacements = str.match(/([{][{][a-zA-Z_]+[}][}])/g);
                    if (label_replacements) {
                        for (let replacement of label_replacements) {
                            if (!(replacement in placeholder_a_to_n)) {
                                let zeropadded = ("987654321000" + num_placeholders).slice(-8);
                                let k = `${zeropadded}`;
                                placeholder_a_to_n[replacement] = k;
                                placeholder_n_to_a[k] = replacement;
                                num_placeholders++;
                            }
                        }
                    }
                }
            }
            if (Object.keys(autotranslations_needed[lang]).length === 0) {
                delete autotranslations_needed[lang];
            }
        }

        const googleSupportedLanguages = {};
        const googleTargetLanguages = await googleTranslate.getSupportedLanguages({
            parent: "projects/" + keys.google_credentials.project_id + "/locations/global",
            displayLanguageCode: "en",
        });
        for (let lang of googleTargetLanguages[0].languages) {
            googleSupportedLanguages[lang.languageCode] = lang.displayName;
        }

        const deeplTargetLanguages = await deepl_translator.getTargetLanguages();
        const deeplSupportedLanguages = {};
        for (let e of deeplTargetLanguages) {
            deeplSupportedLanguages[e.code.toLowerCase()] = true;
        }

        for (let lang in autotranslations_needed) {
            if (lang in deeplSupportedLanguages || lang in googleSupportedLanguages) {
                if (!(lang in autotranslations)) {
                    autotranslations[lang] = {};
                }

                console.log(`Missing translations for ${lang}:`);

                const orig_strs = Object.keys(autotranslations_needed[lang]);
                const strs = orig_strs.map((s) => replace_placeholders(s, placeholder_a_to_n));

                let results = [];

                if (lang in deeplSupportedLanguages) {
                    results = (await deepl_translator.translateText(strs, "en", lang)).map(
                        (r) => r.text,
                    );
                }
                if (lang in googleSupportedLanguages) {
                    const todo = strs.map((s) => s);

                    while (todo.length > 0) {
                        const batch_size = Math.min(100, todo.length);
                        const batch = todo.splice(0, batch_size);
                        const batch_results = await googleTranslate.translateText({
                            parent:
                                "projects/" +
                                keys.google_credentials.project_id +
                                "/locations/global",
                            contents: batch,
                            mimeType: "text/plain",
                            sourceLanguageCode: "en",
                            targetLanguageCode: lang,
                        });

                        for (let i = 0; i < batch.length; i++) {
                            results.push(batch_results[0].translations[i].translatedText);
                        }
                        console.log(`Google Translated ${batch.length} strings`);
                    }
                }

                for (let i = 0; i < orig_strs.length; ++i) {
                    autotranslations[lang][orig_strs[i]] = replace_placeholders(
                        results[i],
                        placeholder_n_to_a,
                    );
                }
            } else {
                console.error("Failed to find a translator for " + lang);
            }
        }

        /*
    await autotranslate(lang, str);
    */

        await fs.promises.writeFile(
            "./autotranslations.json",
            JSON.stringify(autotranslations, undefined, 4),
        );
    }
    else {
        console.log("No autotranslation support on this system, skipping autotranslations");
    }
}

function replace_placeholders(str, dict) {
    for (let k in dict) {
        while (str.indexOf(k) >= 0) {
            str = str.replace(k, dict[k]);
        }
    }
    return str;
}

async function asyncLoadPoFile(filename) {
    return new Promise((resolve, reject) => {
        PO.load(filename, (err, po) => {
            if (err) {
                reject(err);
            } else {
                resolve(po);
            }
        });
    });
}

function encode(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/.{76}(?=.)/g, "$&");
}

function decode(str) {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
}

let bad_symbols = decode(
    "WyLljZAiLCLikrYiLCLimK0iLCLinK8iLCLimK4iLCLinKEiLCLljY0iLCLgv5UiLCLgv5YiLCLi" +
        "nJkiLCLgv5ciLCLgv5giLCLqlqYiLCLwn4+0Iiwi4ZuL4ZuLIl0=",
);

let profanity_regex = {};

let profanity_dictionary = decode(
    "eyJlbiI6WyJuaWdnZXIiLCJjdWNrIiwiZnVjayIsInNoaXQiLCJuYXppIiwiMTQ4OCIsImhpdGxl" +
        "ciIsInN0cmFpZ2h0IHByaWRlIiwiZ2F5IHByaWRlIiwiZ2F5IiwiZ2F5cyJdfQ==",
);

for (let lang in profanity_dictionary) {
    profanity_regex[lang] = new RegExp(
        "(" + profanity_dictionary[lang].map((s) => "\\b" + s + "\\b").join("|") + ")",
        "gui",
    );
}

function looks_vandalized(lang, msg) {
    if (detect_profanity("en", msg)) {
        console.error("en Profanity detected");
        return true;
    }
    if (detect_profanity(lang, msg)) {
        console.error(lang, " Profanity detected");
        return true;
    }

    let lower = msg.toLowerCase();

    for (let entry of bad_symbols) {
        if (lower.indexOf(entry) >= 0) {
            return true;
        }
    }

    return false;
}

function detect_profanity(lang, msg) {
    if (lang in profanity_regex) {
        return profanity_regex[lang].test(msg);
    }

    return false;
}

main()
    .then(() => console.log("Done"))
    .catch((err) => console.error(err));
