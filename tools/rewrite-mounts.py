import json

with open("mounts.json") as infile:
  data = json.load(infile)

obj = {}
for d in data:
  obj[d["id"]] = d
  d["premium"] = True if d["premium"] == "yes" else False
  d["speed"] = int(d["speed"])
  del d["id"]

with open('mounts-new.json', 'w') as outfile:
    json.dump(obj, outfile)
