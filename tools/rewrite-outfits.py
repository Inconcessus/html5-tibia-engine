import json

with open("outfits.json") as infile:
  data = json.load(infile)

obj = {}
for d in data:
  obj[d["looktype"]] = d
  d["enabled"] = True if d["enabled"] == "yes" else False
  d["unlocked"] = True if d["unlocked"] == "yes" else False
  d["premium"] = True if d["premium"] == "yes" else False
  del d["looktype"]

with open('outfits-new.json', 'w') as outfile:
    json.dump(obj, outfile)
