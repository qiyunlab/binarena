#!/usr/bin/env python3
"""Convert a GFF annotation file into a simple mapping.

Usage:
    python me.py -i input.gff -t gene -o output.map

Notes:
    Following "-t" is the attribute tag to extract. Examples are "gene",
    "product", "eC_number", "locus_tag", etc.
"""

import sys
import argparse


def parse_args():
    """Command-line interface.
    """
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter)
    arg = parser.add_argument
    arg('-i', '--input', type=argparse.FileType('r'), default=sys.stdin,
        help='input GFF file, default: stdin')
    arg('-t', '--tag', type=str, required=True,
        help='attribute tag to extract')
    arg('-o', '--output', type=argparse.FileType('w'), default=sys.stdout,
        help='output mapping file, default: stdout')
    for arg in parser._actions:
        arg.metavar = ''
    if len(sys.argv) == 1:
        print(__doc__)
        parser.print_help()
        sys.exit(1)
    return parser.parse_args()


def main():
    args = parse_args()
    out = args.output
    tag = args.tag
    res = {}
    for line in args.input:
        line = line.rstrip('\r\n')
        if line.startswith('#'):
            continue
        row = line.split('\t')
        try:
            attrs = row[8]
        except IndexError:
            continue
        tags = dict(x.split('=') for x in attrs.split(';'))
        if tag in tags:
            res.setdefault(row[0], []).append(tags[tag])
    for seq, features in res.items():
        print(seq, ','.join(features), sep='\t', file=out)


if __name__ == "__main__":
    main()
