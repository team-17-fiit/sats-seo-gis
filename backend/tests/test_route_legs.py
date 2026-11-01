"""Unit testy trasovania etáp bez siete a bez DB."""

from pipelines.route_legs import split_by_network

LINE = [[17.0, 48.0], [17.1, 48.1], [17.2, 48.2], [17.3, 48.3], [17.4, 48.4]]


def test_without_details_whole_leg_is_one_segment():
    assert split_by_network(LINE, []) == [(None, LINE)]


def test_splits_by_marked_network_and_shares_boundary_point():
    parts = split_by_network(LINE, [[0, 2, "REGIONAL"], [2, 4, "MISSING"]])
    assert [p[0] for p in parts] == ["REGIONAL", "MISSING"]
    assert parts[0][1][-1] == parts[1][1][0] == [17.2, 48.2]


def test_merges_neighbouring_intervals_with_same_value():
    parts = split_by_network(LINE, [[0, 1, "LOCAL"], [1, 3, "LOCAL"], [3, 4, "MISSING"]])
    assert [(v, len(c)) for v, c in parts] == [("LOCAL", 4), ("MISSING", 2)]


def test_skips_zero_length_intervals():
    parts = split_by_network(LINE, [[0, 0, "LOCAL"], [0, 4, "MISSING"]])
    assert parts == [("MISSING", LINE)]
