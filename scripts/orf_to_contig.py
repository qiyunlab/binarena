#!/usr/bin/env python3
"""Convert an ORF-to-feature mapping into a contig-to-features mapping.

Usage:
    python me.py orf-to-gene.map > ctg-to-genes.map

Input:
    ORF <tab> feature

Output:
    Contig <tab> feature1,feature2,feature3...

Notes:
    It extracts the contig ID from an ORF ID at the last underscore (_). For
    example, "k99_12345_67" becomes "k99_12345". Contigs and features are
    ordered by their first occurrence in the input file. Multiple copies of
    the same feature per contig are retained.
"""

import sys
import fileinput


def main():
    if sys.stdin.isatty() and len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    res = {}
    for line in fileinput.input():
        line = line.rstrip('\r\n')
        try:
            orf, feature = line.split('\t')
        except ValueError:
            raise ValueError(f'Invalid ORF-to-feature map: {line}.')
        try:
            ctg, _ = orf.rsplit('_', 1)
        except ValueError:
            raise ValueError(f'Cannot extract contig ID from: {orf}.')
        res.setdefault(ctg, []).append(feature)
    for ctg, features in res.items():
        print(ctg, ','.join(features), sep='\t')


if __name__ == "__main__":
    main()
