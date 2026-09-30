"""Can a random forest tell a routine's decks from truly random ones?

For each routine, scripts/forest-features.ts shuffles many decks from sorted and writes 38 features per deck. This
script trains a random forest to separate those decks from truly random ones and reports its accuracy under 5-fold
cross-validation, so every deck is tested once by a forest that never saw it. 50% means the forest can't tell them
apart. A control compares two sets of truly random decks, which shows how high the forest reads by chance. A logistic
regression on the same features is reported alongside as a simpler baseline.

Requires scikit-learn and numpy (pip install -r scripts/requirements.txt).

Usage: python scripts/forest.py --routine "M×12" --routine "M×5·P·M×5" [--decks 50000] [--trees 300] [--jobs 8]
"""

import argparse
import json
import math
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--routine", action="append", required=True, help='a routine, for example "M×5·P·M×5"; repeat for more')
    parser.add_argument("--decks", type=int, default=50000, help="decks per set (default 50000)")
    parser.add_argument("--folds", type=int, default=5)
    parser.add_argument("--trees", type=int, default=300)
    parser.add_argument("--leaf", type=int, default=20, help="minimum decks per leaf; keeps trees small (default 20)")
    parser.add_argument("--jobs", type=int, default=8, help="parallel jobs for the forest (default 8)")
    parser.add_argument("--seed", type=int, default=0, help="seed for the folds and the forest (default 0)")
    parser.add_argument("--out", default="logs/forest", help="folder for the feature files and results (default logs/forest)")
    return parser.parse_args()


def make_features(label, args_for_node, decks, out_dir):
    """Run the TypeScript feature script and load its CSV."""
    path = out_dir / f"{label}.csv"
    command = ["node", str(ROOT / "scripts" / "forest-features.ts"), *args_for_node, "--decks", str(decks), "--out", str(path)]
    subprocess.run(command, check=True, cwd=ROOT)
    with open(path, encoding="utf-8") as handle:
        header = handle.readline().strip().split(",")
    return header, np.loadtxt(path, delimiter=",", skiprows=1)


def interval(correct, total):
    """95% Wilson interval for an accuracy, as percentages."""
    p = correct / total
    z = 1.96
    centre = (p + z * z / (2 * total)) / (1 + z * z / total)
    half = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / (1 + z * z / total)
    return 100 * (centre - half), 100 * (centre + half)


def compare(name, positive, negative, header, args):
    """Cross-validated accuracy of a forest and a logistic regression at telling positive decks from negative ones."""
    x = np.vstack([positive, negative])
    y = np.concatenate([np.ones(len(positive)), np.zeros(len(negative))])
    folds = StratifiedKFold(n_splits=args.folds, shuffle=True, random_state=args.seed)
    forest = RandomForestClassifier(
        n_estimators=args.trees, min_samples_leaf=args.leaf, max_features="sqrt", n_jobs=args.jobs, random_state=args.seed
    )
    logistic = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))

    result = {"comparison": name, "decks_each": len(positive)}
    for label, model in (("forest", forest), ("logistic", logistic)):
        started = time.time()
        predicted = cross_val_predict(model, x, y, cv=folds)
        correct = int((predicted == y).sum())
        low, high = interval(correct, len(y))
        result[label] = {"accuracy": 100 * correct / len(y), "interval": [low, high], "seconds": round(time.time() - started)}

    # Which features the forest leaned on, from one forest fitted on every deck. Impurity importance is a rough guide:
    # it is biased toward features with many distinct values, such as card positions.
    forest.fit(x, y)
    ranked = sorted(zip(header, forest.feature_importances_), key=lambda pair: -pair[1])
    result["top_features"] = [[feature, round(float(weight), 4)] for feature, weight in ranked[:8]]

    # The logistic model's weights on standardized features: the size says how much a feature moves the guess, and the
    # sign says which way (positive leans toward the routine's decks).
    logistic.fit(x, y)
    weights = logistic[-1].coef_[0]
    ranked = sorted(zip(header, weights), key=lambda pair: -abs(pair[1]))
    result["logistic_weights"] = [[feature, round(float(weight), 4)] for feature, weight in ranked[:8]]
    return result


def report(result):
    forest, logistic = result["forest"], result["logistic"]
    print(f"\n{result['comparison']}  ({result['decks_each']} decks each)")
    print(f"  random forest        {forest['accuracy']:.2f}%  (95% {forest['interval'][0]:.2f}–{forest['interval'][1]:.2f})  {forest['seconds']}s")
    print(f"  logistic regression  {logistic['accuracy']:.2f}%  (95% {logistic['interval'][0]:.2f}–{logistic['interval'][1]:.2f})  {logistic['seconds']}s")
    print("  forest's top features: " + ", ".join(f"{name} {weight}" for name, weight in result["top_features"]))
    print("  logistic's largest weights: " + ", ".join(f"{name} {weight:+}" for name, weight in result["logistic_weights"]))
    sys.stdout.flush()


def main():
    args = parse_args()
    out_dir = ROOT / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    started = time.time()

    print(f"Making {args.decks} decks per set: two truly random sets, then each routine from sorted.")
    header, random_a = make_features("random_a", ["--random"], args.decks, out_dir)
    _, random_b = make_features("random_b", ["--random"], args.decks, out_dir)
    results = [compare("Control: random vs random", random_a, random_b, header, args)]
    report(results[-1])

    for index, routine in enumerate(args.routine):
        _, decks = make_features(f"routine_{index}", ["--routine", routine], args.decks, out_dir)
        results.append(compare(f"{routine} vs random", decks, random_b, header, args))
        report(results[-1])

    summary = {"options": vars(args), "features": header, "seconds": round(time.time() - started), "results": results}
    (out_dir / "results.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"\nFinished in {summary['seconds']}s. Wrote {args.out}/results.json.")


if __name__ == "__main__":
    main()
