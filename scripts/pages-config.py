#!/usr/bin/env python3
"""Build .pages.yml (Pages CMS) from scripts/pages.base.yml.

Dutch is the main language:
  * "Nederlands" gets every collection and field from the base, in content/nl/...
  * "English" only edits translations in translations/en/...: a "Translation of"
    link to the Dutch page plus the text fields listed in TEXT below. Everything
    else (GPX, numbers, links, photos, dates, draft status) comes from the Dutch
    page at build time (content/en/_content.gotmpl).

Run from the repo root:  python3 scripts/pages-config.py   (needs PyYAML)
"""
import copy
import os
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MAIN = "nl"

# Text fields per base collection/file; keep in sync with content/en/_content.gotmpl (nothing to change
# there: it simply lays every field of a translation over the Dutch page).
TEXT = {
    "stories": ["title", "description", "cover_alt", "route_note", "moments", "body"],
    "trips": ["title", "description", "cover_alt", "body"],
    "trails": ["title", "short", "description", "region", "cover_alt", "good_to_know", "body"],
    "stages": ["title", "start_transport", "finish_transport", "water", "body"],
    "stays": ["title", "description", "access", "booking", "price", "facilities", "body"],
    "gear": ["title", "description", "items", "lessons", "body"],
    "home": ["heading", "intro", "cover_alt", "cover_caption"],
    "about": ["title", "heading", "description", "cover_alt", "body"],
    "stories-index": ["title", "heading", "intro"],
    "trails-index": ["title", "heading", "intro"],
    "stays-index": ["title", "heading", "intro"],
    "gear-index": ["title", "heading", "intro"],
}
# inside lists of objects only these are text; the rest (weights, times, icons) comes from Dutch
SUBTEXT = {"moments": ["title", "text"], "good_to_know": ["text"], "items": ["name", "notes"]}
NOTE = {
    "moments": "Same order as the Dutch moments; times come from the Dutch page",
    "good_to_know": "Same order as the Dutch list; icons come from the Dutch page",
    "items": "Same order as the Dutch items; weights and categories come from the Dutch page",
}

base = yaml.safe_load(open(os.path.join(HERE, "pages.base.yml")))

# the tags checklist comes from data/tags.yaml (key = what's stored, label = the English name)
TAGS = yaml.safe_load(open(os.path.join(ROOT, "data", "tags.yaml")))


def fill_tags(fields):
    for f in fields or []:
        if f.get("name") == "tags" and f.get("type") == "select":
            f["options"]["values"] = [{"name": k, "label": v["en"]} for k, v in TAGS.items()]
        fill_tags(f.get("fields"))


def flat(items):
    for it in items:
        if it.get("type") == "group":
            yield from flat(it["items"])
        else:
            yield it


ITEMS = list(flat(base["content"]))
for _it in ITEMS:
    fill_tags(_it.get("fields"))
NAMES = {it["name"] for it in ITEMS}


def fix_refs(fields, lang):
    for f in fields or []:
        opts = f.get("options") or {}
        if f.get("type") == "reference" and opts.get("collection") in NAMES:
            opts["collection"] = f'{opts["collection"]}_{lang}'
        fix_refs(f.get("fields"), lang)


def main_item(item):
    it = copy.deepcopy(item)
    it["name"] = f'{it["name"]}_{MAIN}'
    it["path"] = it["path"].replace("content/", f"content/{MAIN}/", 1)
    fix_refs(it.get("fields"), MAIN)
    return it


def translation_item(item, lang):
    it = copy.deepcopy(item)
    keep = TEXT[it["name"]]
    fields = []
    for f in it.get("fields", []):
        if f["name"] not in keep:
            continue
        f = copy.deepcopy(f)
        if f["name"] in SUBTEXT:
            f["fields"] = [s for s in f["fields"] if s["name"] in SUBTEXT[f["name"]]]
            f["description"] = NOTE[f["name"]]
            if isinstance(f.get("list"), dict):
                f["list"] = {"collapsible": {"collapsed": True, "summary": "{" + SUBTEXT[f["name"]][0] + "}"}}
        f.pop("required", None) if f["name"] != "title" else None
        fields.append(f)
    if it["type"] == "collection":
        fields.insert(0, {
            "name": "of",
            "label": "Translation of",
            "description": "The Dutch page this English text belongs to",
            "type": "reference",
            "required": True,
            "options": {"collection": f'{it["name"]}_{MAIN}', "search": "title"},
        })
        it["view"] = {"fields": ["title", "of"], "primary": "title", "search": ["title"]}
        it["filename"] = {"template": "{primary}.md", "field": "create"}
    it["fields"] = fields
    it["name"] = f'{it["name"]}_{lang}'
    it["path"] = it["path"].replace("content/", f"translations/{lang}/", 1)
    return it


out = {
    "media": base["media"],
    "content": [
        {"name": MAIN, "label": "Nederlands", "type": "group", "items": [main_item(x) for x in ITEMS]},
        {"name": "en", "label": "English (translations)", "type": "group",
         "items": [translation_item(x, "en") for x in ITEMS]},
    ],
}

header = (
    "# GENERATED by scripts/pages-config.py from scripts/pages.base.yml — edit those, not this file.\n"
    "# Pages CMS configuration for patrickontrack.nl (Hugo). Docs: https://pagescms.org/docs/configuration/\n"
    "# Nederlands (content/nl) holds every page and all its data.\n"
    "# English (translations/en) only holds English text; the rest is taken from the Dutch page.\n\n"
)
with open(os.path.join(ROOT, ".pages.yml"), "w") as f:
    f.write(header + yaml.safe_dump(out, sort_keys=False, allow_unicode=True, width=200))
print("wrote .pages.yml")
