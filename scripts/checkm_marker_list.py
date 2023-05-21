#!/usr/bin/env python3
"""Convert a CheckM marker set into a list of markers.

Usage:
    python me.py taxon.ms > marker.lst

Note:
    This input file can be generated using (for example):
    checkm taxon_set phylum Cyanobacteria cyanobacteria.ms
"""

import sys
import fileinput
import re


def main():
    if sys.stdin.isatty() and len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for line in fileinput.input():
        if line.startswith('#'):
            continue
        line = line.rstrip().split('\t')[5]
        break
    mss = re.findall(r'{.*?}', line)
    res = []
    for ms in mss:
        res.extend(ms[1:-1].replace("'", '').split(', '))
    for key in sorted(set(res)):
        print(key)


if __name__ == "__main__":
    main()
