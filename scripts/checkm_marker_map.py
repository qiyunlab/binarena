#!/usr/bin/env python3
"""Convert CheckM output into a contig-to-marker(s) map.

Usage:
    python me.py marker_gene_stats.tsv > marker.map

Note:
    This input file can be found in a typical CheckM output directory, under
    subdirectory storage/.
"""

import sys
import fileinput
import json
from collections import Counter


def main():
    if sys.stdin.isatty() and len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for line in fileinput.input():
        if line.startswith('#'):
            continue
        line = line.rstrip().split('\t')[-1]
        break
    res = {}
    for orf, markers in json.loads(line.replace("'", '"')).items():
        contig = orf.rpartition('_')[0]
        for marker in markers.keys():
            res.setdefault(contig, []).append(marker)
    for contig, markers in sorted(res.items()):
        row = []
        for marker, count in sorted(Counter(markers).items()):
            row.append(marker if count == 1 else f'{marker}:{count}')
        print(contig, ','.join(row), sep='\t')


if __name__ == "__main__":
    main()
