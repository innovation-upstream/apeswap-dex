import { Currency, ETHER, Token } from '@apeswapfinance/sdk'
import React, { KeyboardEvent, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Text, CloseIcon } from '@apeswapfinance/uikit'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FixedSizeList } from 'react-window'
import styled, { ThemeContext } from 'styled-components'
import AutoSizer from 'react-virtualized-auto-sizer'
import { Edit } from 'react-feather'
import { TokenList } from '@uniswap/token-lists'
import useDebounce from 'hooks/useDebounce'
import { useActiveWeb3React } from '../../hooks'
import { AppState } from '../../state'
import { useAllTokens, useToken } from '../../hooks/Tokens'
import { useSelectedListInfo } from '../../state/lists/hooks'
import { LinkStyledButton, TYPE } from '../Shared'
import { isAddress } from '../../utils'
import Card from '../Card'
import Column from '../Column'
import ListLogo from '../ListLogo'
import QuestionHelper from '../QuestionHelper'
import Row, { RowBetween, RowFixed } from '../Row'
import CommonBases from './CommonBases'
import CurrencyList from './CurrencyList'
import { filterTokens, useSortedTokensByQuery } from './filtering'
import SortButton from './SortButton'
import { useTokenComparator } from './sorting'
import { PaddedColumn, SearchInput, Separator } from './styleds'
import TranslatedText from '../TranslatedText'
import { TranslateString } from '../../utils/translateTextHelpers'
import Manage from './Manage'

const Footer = styled.div`
  width: 100%;
  border-radius: 20px;
  padding: 20px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.text};
  color: ${({ theme }) => theme.colors.text}
`
const SectionManage = styled.div`
  box-sizing: border-box;
  margin: 0px;
  min-width: 0px;
  width: 100%;
  display: flex;
  padding: 0px;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-pack: center;
  justify-content: center;
`

const ButtonText = styled.button`
  outline: none;
  border: none;
  font-size: inherit;
  padding: 0;
  margin: 0;
  background: none;
  cursor: pointer;

  :hover {
    opacity: 0.7;
  }

  :focus {
    text-decoration: underline;
  }
`
export const IconWrapper = styled.div<{ stroke?: string; size?: string; marginRight?: string; marginLeft?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ size }) => size ?? '20px'};
  height: ${({ size }) => size ?? '20px'};
  margin-right: ${({ marginRight }) => marginRight ?? 0};
  margin-left: ${({ marginLeft }) => marginLeft ?? 0};
  & > * {
    stroke: ${({ theme, stroke }) => stroke ?? theme.colors.text};
  }
`
const { main: Main } = TYPE

interface CurrencySearchProps {
  isOpen: boolean
  onDismiss: () => void
  selectedCurrency?: Currency | null
  onCurrencySelect: (currency: Currency) => void
  otherSelectedCurrency?: Currency | null
  showCommonBases?: boolean
  onChangeList: () => void
}

export function CurrencySearch({
  selectedCurrency,
  onCurrencySelect,
  otherSelectedCurrency,
  showCommonBases,
  onDismiss,
  isOpen,
  onChangeList,
}: CurrencySearchProps) {
  const { t } = useTranslation()
  const { chainId } = useActiveWeb3React()
  const theme = useContext(ThemeContext)

  const fixedList = useRef<FixedSizeList>()
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [invertSearchOrder, setInvertSearchOrder] = useState<boolean>(false)
  const allTokens = useAllTokens()
  const debouncedQuery = useDebounce(searchQuery, 200)

  // if they input an address, use it
  const isAddressSearch = isAddress(searchQuery)
  const searchToken = useToken(searchQuery)

  const showETH: boolean = useMemo(() => {
    const s = searchQuery.toLowerCase().trim()
    return s === '' || s === 'e' || s === 'et' || s === 'eth'
  }, [searchQuery])

  const tokenComparator = useTokenComparator(invertSearchOrder)

  const audioPlay = useSelector<AppState, AppState['user']['audioPlay']>((state) => state.user.audioPlay)

  const filteredTokens: Token[] = useMemo(() => {
    if (isAddressSearch) return searchToken ? [searchToken] : []
    return filterTokens(Object.values(allTokens), searchQuery)
  }, [isAddressSearch, searchToken, allTokens, searchQuery])

  // const filteredSortedTokens = useSortedTokensByQuery(filteredTokens, debouncedQuery)
  const filteredSortedTokens: Token[] = useMemo(() => {
    if (searchToken) return [searchToken]
    const sorted = filteredTokens.sort(tokenComparator)

    const symbolMatch = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((s) => s.length > 0)
    if (symbolMatch.length > 1) return sorted

    return [
      ...(searchToken ? [searchToken] : []),
      // sort any exact symbol matches first
      ...sorted.filter((token) => token.symbol?.toLowerCase() === symbolMatch[0]),
      ...sorted.filter((token) => token.symbol?.toLowerCase() !== symbolMatch[0]),
    ]
  }, [filteredTokens, searchQuery, searchToken, tokenComparator])

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      onCurrencySelect(currency)
      onDismiss()
      if (audioPlay) {
        const audio = document.getElementById('bgMusic') as HTMLAudioElement
        if (audio) {
          audio.play()
        }
      }
    },
    [onDismiss, onCurrencySelect, audioPlay]
  )

  // clear the input on open
  useEffect(() => {
    if (isOpen) setSearchQuery('')
  }, [isOpen])

  // manage focus on modal show
  const inputRef = useRef<HTMLInputElement>()
  const handleInput = useCallback((event) => {
    const input = event.target.value
    const checksummedInput = isAddress(input)
    setSearchQuery(checksummedInput || input)
    fixedList.current?.scrollTo(0)
  }, [])

  const handleEnter = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const s = searchQuery.toLowerCase().trim()
        if (s === 'eth') {
          handleCurrencySelect(ETHER)
        } else if (filteredSortedTokens.length > 0) {
          if (
            filteredSortedTokens[0].symbol?.toLowerCase() === searchQuery.trim().toLowerCase() ||
            filteredSortedTokens.length === 1
          ) {
            handleCurrencySelect(filteredSortedTokens[0])
          }
        }
      }
    },
    [filteredSortedTokens, handleCurrencySelect, searchQuery]
  )

  const selectedListInfo = useSelectedListInfo()
  const [showTokens, setShowTokens] = useState(true);
  // used for import token flow
  const [importToken, setImportToken] = useState<Token | undefined>()

  // used for import list
  const [importList, setImportList] = useState<TokenList | undefined>()
  const [listURL, setListUrl] = useState<string | undefined>()

  return (
    <Column style={{ width: '100%', flex: '1 1' }}>
      { showTokens ? (
      <>
      <PaddedColumn gap="14px">
        <RowBetween>
          <Text>
            <TranslatedText translationId={82}>Select a token</TranslatedText>
            <QuestionHelper
              text={TranslateString(
                130,
                'Find a token by searching for its name or symbol or by pasting its address below.'
              )}
            />
          </Text>
          <CloseIcon onClick={onDismiss} />
        </RowBetween>
        <SearchInput
          type="text"
          id="token-search-input"
          placeholder={t('tokenSearchPlaceholder')}
          value={searchQuery}
          ref={inputRef as RefObject<HTMLInputElement>}
          onChange={handleInput}
          onKeyDown={handleEnter}
        />
        {showCommonBases && (
          <CommonBases chainId={chainId} onSelect={handleCurrencySelect} selectedCurrency={selectedCurrency} />
        )}
        <RowBetween>
          <Text fontSize="14px">
            <TranslatedText translationId={126}>Token name</TranslatedText>
          </Text>
          <SortButton ascending={invertSearchOrder} toggleSortOrder={() => setInvertSearchOrder((iso) => !iso)} />
        </RowBetween>
      </PaddedColumn>

      <Separator />

      <div style={{ flex: '1' }}>
        <AutoSizer disableWidth>
          {({ height }) => (
            <CurrencyList
              height={height}
              showETH={showETH}
              currencies={filteredSortedTokens}
              onCurrencySelect={handleCurrencySelect}
              otherCurrency={otherSelectedCurrency}
              selectedCurrency={selectedCurrency}
              fixedListRef={fixedList}
            />
          )}
        </AutoSizer>
      </div>
      <Footer>
        <SectionManage>
          <ButtonText className="list-token-manage-button" onClick={()=>setShowTokens(false)}>
            <RowFixed>
              <IconWrapper size="16px" marginRight="6px">
                <Edit />
              </IconWrapper>
              <Text fontSize="14px">
                <span>Manage</span>
              </Text>
            </RowFixed>
          </ButtonText>
        </SectionManage>
      </Footer>
      {null && (
        <>
          <Separator />
          <Card>
            <RowBetween>
              {selectedListInfo.current ? (
                <Row>
                  {selectedListInfo.current.logoURI ? (
                    <ListLogo
                      style={{ marginRight: 12 }}
                      logoURI={selectedListInfo.current.logoURI}
                      alt={`${selectedListInfo.current.name} list logo`}
                    />
                  ) : null}
                  <Main id="currency-search-selected-list-name">{selectedListInfo.current.name}</Main>
                </Row>
              ) : null}
              <LinkStyledButton
                style={{ fontWeight: 500, color: theme.colors.textSubtle, fontSize: 16 }}
                onClick={onChangeList}
                id="currency-search-change-list-button"
              >
                {selectedListInfo.current ? 'Change' : 'Select a list'}
              </LinkStyledButton>
            </RowBetween>
          </Card>
        </>
      )}
      </>
      )
      : <Manage onDismiss={onDismiss} setShowTokens={setShowTokens} setListUrl={setListUrl} setImportList={setImportList}/>
      }
    </Column>
  )
}

export default CurrencySearch
