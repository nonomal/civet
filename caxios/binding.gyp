{
  "targets": [
    {
      "target_name": "civetkern",
      "sources": [
        "src/lmdb/mdb.c",
        "src/lmdb/midl.c",
        "src/util/util.cpp",
        "src/interface.cpp",
        "src/civetkern.cpp" ],
      "include_dirs": [
        "include",
        "node_modules/nan"
      ],
      "cflags!": [],
      "cflags_cc!": []
    }
  ]
}