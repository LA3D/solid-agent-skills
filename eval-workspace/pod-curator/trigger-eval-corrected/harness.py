import json, subprocess, os, sys, pathlib, time
SK="skills/pod-curator/evals/trigger-eval.json"
queries=json.load(open(SK))
env=dict(os.environ); env.pop("CLAUDECODE",None)
def triggered(q):
    p=subprocess.run(["claude","-p",q,"--output-format","stream-json","--verbose","--max-turns","2"],
                     capture_output=True, text=True, env=env, timeout=180)
    for line in p.stdout.splitlines():
        line=line.strip()
        if not line: continue
        try: ev=json.loads(line)
        except: continue
        m=ev.get("message",{})
        for b in (m.get("content") or []) if isinstance(m,dict) else []:
            if isinstance(b,dict) and b.get("type")=="tool_use" and b.get("name")=="Skill" \
               and "pod-curator" in json.dumps(b.get("input",{})):
                return True
    return False
rows=[]
for i,e in enumerate(queries):
    try: fired=triggered(e["query"])
    except Exception as ex: fired=None; print(f"[{i}] ERROR {ex}", file=sys.stderr)
    rows.append({"query":e["query"],"should_trigger":e["should_trigger"],"fired":fired})
    print(f"[{i+1}/{len(queries)}] want={e['should_trigger']} fired={fired}  {e['query'][:60]}", file=sys.stderr)
json.dump(rows, open("eval-workspace/pod-curator/trigger-eval-corrected/results.json","w"), indent=2)
tp=sum(1 for r in rows if r["should_trigger"] and r["fired"])
fp=sum(1 for r in rows if not r["should_trigger"] and r["fired"])
tn=sum(1 for r in rows if not r["should_trigger"] and r["fired"]==False)
fn=sum(1 for r in rows if r["should_trigger"] and r["fired"]==False)
prec=tp/(tp+fp) if tp+fp else 1.0; rec=tp/(tp+fn) if tp+fn else 0.0
print(f"\nTP={tp} FP={fp} TN={tn} FN={fn}  precision={prec:.0%} recall={rec:.0%} accuracy={(tp+tn)/len(rows):.0%}")
