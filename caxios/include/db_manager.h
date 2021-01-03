#ifndef _CAXIOS_DB_MANAGER_H_
#define _CAXIOS_DB_MANAGER_H_
#include "database.h"
#include "json.hpp"
#include <map>
#include <Table.h>
#include "log.h"
#include "QueryAction.h"

#define TABLE_FILEID        32    // "file_cur_id"

#define TB_Keyword    "keyword"
#define TB_Tag        "tag"
#define TB_Class      "class"
#define TB_Annotation "annotation"
#define TB_FileID     "fileid"

namespace caxios {
  class DBManager {
  public:
    DBManager(const std::string& dbdir, int flag, const std::string& meta = "");
    ~DBManager();

    std::vector<FileID> GenerateNextFilesID(int cnt = 1);
    bool AddFiles(const std::vector <std::tuple< FileID, MetaItems, Keywords >>&);
    bool AddClasses(const std::vector<std::string>& classes);
    bool AddClasses(const std::vector<std::string>& classes, const std::vector<FileID>& filesID);
    bool RemoveFiles(const std::vector<FileID>& filesID);
    bool RemoveTags(const std::vector<FileID>& files, const Tags& tags);
    bool RemoveClasses(const std::vector<std::string>& classes);
    bool RemoveClasses(const std::vector<std::string>& classes, const std::vector<FileID>& filesID);
    bool SetTags(const std::vector<FileID>& filesID, const std::vector<std::string>& tags);
    bool GetFilesInfo(const std::vector<FileID>& filesID, std::vector< FileInfo>& filesInfo);
    bool GetFilesSnap(std::vector< Snap >& snaps);
    bool GetUntagFiles(std::vector<FileID>& filesID);
    bool GetUnClassifyFiles(std::vector<FileID>& filesID);
    bool GetTagsOfFiles(const std::vector<FileID>& filesID, std::vector<Tags>& tags);
    bool GetClasses(const std::string& parent, nlohmann::json& classes);
    bool GetAllTags(TagTable& tags);
    bool UpdateFilesClasses(const std::vector<FileID>& filesID, const std::vector<std::string>& classes);
    bool UpdateClassName(const std::string& oldName, const std::string& newName);
    bool UpdateFileMeta(const std::vector<FileID>& filesID, const nlohmann::json& mutation);
    bool Query(const std::string& query, std::vector< FileInfo>& filesInfo);

  public: // will be implimented in ITable
    template<typename F>
    std::vector<FileID> QueryImpl(const std::string& keyword, F& compare)
    {
      std::vector<FileID> vOut;
      auto itr = m_mTables.find(keyword);
      if (itr != m_mTables.end()) {
        // meta
        auto cursor = std::begin(*(itr->second));
        auto end = Iterator();
        for (; cursor != end; ++cursor) {
          auto item = *cursor;
          typename F::type val = *(typename F::type*)(item.first.mv_data);
          if (compare(val)) {
            FileID* start = (FileID*)(item.second.mv_data);
            vOut.insert(vOut.end(), start, start + item.second.mv_size / sizeof(FileID));
          }
        }
      }
      else {
        if (keyword == TB_Keyword) return this->Query(m_mKeywordMap[keyword], compare.condition());
        MDB_dbi dbi = m_mDBs[m_mKeywordMap[keyword]];
        //if (subset.empty()) {
        //  
        //}
        //else {
        //}
      }
      return vOut;
    }

  private:
    void ValidVersion();
    void InitMap();
    bool AddFile(FileID, const MetaItems&, const Keywords&);
    bool AddFileID2Tag(const std::vector<FileID>&, WordIndex);
    bool AddFileID2Keyword(FileID, WordIndex);
    bool AddKeyword2File(WordIndex, FileID);
    bool AddTagPY(const std::string& tag, WordIndex indx);
    bool AddClass2FileID(uint32_t, const std::vector<FileID>& vFilesID);
    bool AddFileID2Class(const std::vector<FileID>&, uint32_t);
    void MapHash2Class(uint32_t clsID, const std::string& name);
    std::vector<uint32_t> AddClassImpl(const std::vector<std::string>& classes);
    bool RemoveFile(FileID);
    void RemoveFile(FileID, const std::string& file2type, const std::string& type2file);
    bool RemoveTag(FileID, const Tags& tags);
    bool RemoveClassImpl(const std::string& classPath);
    bool RemoveKeywords(const std::vector<FileID>& filesID, const std::vector<std::string>& keyword);
    bool RemoveFileIDFromKeyword(FileID fileID);
    bool GetFileInfo(FileID fileID, MetaItems& meta, Keywords& keywords, Tags& tags, Annotations& anno);
    bool GetFileTags(FileID fileID, Tags& tags);
    std::vector<FileID> GetFilesByClass(const std::vector<WordIndex>& clazz);
    bool IsFileExist(FileID fileID);
    bool IsClassExist(const std::string& clazz);
    uint32_t GenerateClassHash(const std::string& clazz);
    uint32_t GetClassHash(const std::string& clazz);
    uint32_t GetClassParent(const std::string& clazz);
    std::pair<uint32_t, std::string> EncodePath2Hash(const std::string& classPath);
    std::vector<ClassID> GetClassChildren(const std::string& clazz);
    std::string GetClassByHash(ClassID);
    std::vector<FileID> GetFilesOfClass(uint32_t clsID);
    std::vector<FileID> mapExistFiles(const std::vector<FileID>&);
    void ParseMeta(const std::string& meta);
    void UpdateCount1(CountType ct, int cnt);
    void SetSnapStep(FileID fileID, int bit, bool set=true);
    char GetSnapStep(FileID fileID, nlohmann::json&);
    Snap GetFileSnap(FileID);
    std::map<std::string, WordIndex> GetWordsIndex(const std::vector<std::string>& words);
    WordIndex GetWordIndex(const std::string& word);
    std::vector<std::string> GetWordByIndex(const WordIndex* const wordsIndx, size_t cnt);
    template<typename Itr>
    std::map<WordIndex, std::string> GetWordByIndex(const Itr start, const Itr end) {
      std::map<WordIndex, std::string> mWords;
      for (Itr itr = start; itr != end; ++itr)
      {
        WordIndex index = *itr;
        if (index == 0) {
          T_LOG("dict", "word index: 0");
          continue;
        }
        void* pData = nullptr;
        uint32_t len = 0;
        if (!m_pDatabase->Get(m_mDBs[TABLE_INDX_KEYWORD], index, pData, len)) continue;
        std::string word((char*)pData, len);
        mWords[index] = word;
      }
      return std::move(mWords);
    }
    std::vector<std::vector<FileID>> GetFilesIDByTagIndex(const WordIndex* const wordsIndx, size_t cnt);

  private:
    std::vector<FileID> Query(const std::string& tableName, const std::vector<std::string>& values);
    std::vector<FileID> Query(const std::string& tableName, const std::vector<time_t>& values);

  private:
    DBFlag _flag = ReadWrite;
    CDatabase* m_pDatabase = nullptr;
    std::map<std::string, MDB_dbi > m_mDBs;
    std::map<std::string, std::string> m_mKeywordMap;
    std::map<std::string, ITable*> m_mTables;
  };
}

#endif
